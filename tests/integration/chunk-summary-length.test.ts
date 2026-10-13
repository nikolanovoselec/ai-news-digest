// Behavioral coverage for REQ-PIPE-002 AC5 / REQ-PIPE-015 AC6.
// Generation targets 150 words; otherwise-valid summaries through 200
// are retained unchanged. The existing 80-word backstop stays.
// Real D1/KV; only Gateway, embeddings, Vectorize and queues are stubbed.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { applyD1Migrations, env } from '../fixtures/cloudflare-test';
import { handleChunkBatch, processOneChunk, type ChunkJobMessage } from '~/queue/scrape-chunk-consumer';
import { DEFAULT_MODEL_ID, MODELS } from '~/lib/models';
import { generateUlid } from '~/lib/ulid';

const GATEWAY = 'https://gateway.ai.cloudflare.com/v1/summary-test/account/compat/chat/completions';
const INITIAL_USAGE = { input_tokens: 211, output_tokens: 173 };

// Controlled word boundaries, with distinctive paragraph endings so
// exact persisted prose also detects unwanted clipping or rewriting.
const PROSE = 'Cloudflare introduced infrastructure that helps developers deploy artificial intelligence applications securely across distributed networks. The platform provides monitoring tools and predictable routing while teams evaluate reliability and measure latency under realistic workloads. Engineers retain control over deployments and review operational results before expanding availability to additional customers.';
function paragraph(count: number, ending: string): string {
  const words = PROSE.split(/\s+/);
  return [...Array.from({ length: count - 1 }, (_, i) => words[i % words.length]!), `${ending}.`].join(' ');
}
function paragraphs(count: number, marker: string): string[] {
  const first = Math.floor(count / 2);
  return [paragraph(first, `${marker}lead`), paragraph(count - first, `${marker}conclusion`)];
}
type Details = string | string[];
interface OutputArticle { index: number; title: string; details: Details; tags: string[] }
function article(index: number, details: Details): OutputArticle {
  return { index, title: `Cloudflare expands developer infrastructure in region ${index}`, details, tags: [index % 2 === 0 ? 'cloudflare' : 'generative-ai'] };
}
interface GatewayReply { content: string; usage: typeof INITIAL_USAGE }
function reply(articles: unknown[], usage = INITIAL_USAGE): GatewayReply {
  return { content: JSON.stringify({ articles }), usage };
}
function runtime(response: GatewayReply): Env {
  vi.stubGlobal('fetch', async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url !== GATEWAY) throw new Error(`unexpected outbound fetch: ${url}`);
    return Response.json({ response: response.content, usage: response.usage });
  });
  const queue = { send: async () => undefined, sendBatch: async () => undefined };
  return {
    ...env,
    AI_GATEWAY_API_TOKEN: 'test-only-token',
    AI_GATEWAY_URL: GATEWAY,
    QUEUE_MAX_RETRIES: '3',
    AI: { run: async (model: string, params: { text?: string[] }) => {
      if (!model.startsWith('@cf/baai/bge-')) throw new Error(`unexpected embedding model: ${model}`);
      return { data: (params.text ?? []).map(() => Array.from({ length: 768 }, () => 0)) };
    } },
    VECTORIZE: {
      upsert: async () => ({ count: 0, ids: [] }),
      query: async () => ({ count: 0, matches: [] }),
      queryById: async () => ({ count: 0, matches: [] }),
      deleteByIds: async () => ({ count: 0, ids: [] }),
    },
    SCRAPE_COORDINATOR: queue,
    SCRAPE_CHUNKS: queue,
    SCRAPE_FINALIZE: queue,
    DIGEST_JOBS: queue,
  } as unknown as Env;
}
async function seed(count: number): Promise<ChunkJobMessage> {
  const id = generateUlid();
  await env.DB.prepare(`INSERT INTO scrape_runs (id, model_id, started_at, status, chunk_count)
    VALUES (?, ?, ?, 'running', 1)`).bind(id, DEFAULT_MODEL_ID, 1_713_900_000).run();
  return {
    scrape_run_id: id, chunk_index: 0, total_chunks: 1,
    candidates: Array.from({ length: count }, (_, index) => ({
      canonical_url: `https://summary.example.com/news/${id}/article-${index}`,
      source_url: `https://summary.example.com/news/${id}/article-${index}`,
      source_name: `Primary publisher ${index}`,
      title: article(index, '').title,
      published_at: 1_713_900_000 + index,
      body_snippet: PROSE.repeat(4),
      alternatives: [{
        source_url: `https://secondary.example.com/news/${id}/article-${index}`,
        source_name: `Alternative publisher ${index}`,
      }],
    })),
  };
}

enum Disposition { Pending = 'pending', Ack = 'ack', Retry = 'retry', Invalid = 'invalid' }
async function deliver(runtimeEnv: Env, body: ChunkJobMessage): Promise<Disposition> {
  let disposition = Disposition.Pending;
  const settle = (next: Disposition) => {
    disposition = disposition === Disposition.Pending ? next : Disposition.Invalid;
  };
  const batch = {
    queue: 'scrape-chunks',
    messages: [{ id: `${body.scrape_run_id}:0`, timestamp: new Date(), body, attempts: 1,
      ack: () => settle(Disposition.Ack), retry: () => settle(Disposition.Retry) }],
    ackAll: () => settle(Disposition.Ack), retryAll: () => settle(Disposition.Retry),
  } as unknown as MessageBatch<ChunkJobMessage>;
  await handleChunkBatch(batch, runtimeEnv);
  return disposition;
}
interface ArticleRow {
  canonical_url: string; title: string; details_json: string; tags_json: string;
  primary_source_url: string; primary_source_name: string; published_at: number; source_snippet: string;
}
interface RunRow {
  status: string; finished_at: number | null; tokens_in: number; tokens_out: number;
  estimated_cost_usd: number; articles_ingested: number; articles_deduped: number;
  finalize_enqueued: number;
}
async function state(runId: string) {
  const articles = await env.DB.prepare('SELECT * FROM articles WHERE scrape_run_id = ? ORDER BY canonical_url').bind(runId).all<ArticleRow>();
  const sources = await env.DB.prepare(`SELECT a.canonical_url, s.source_name, s.source_url, s.published_at
    FROM article_sources s JOIN articles a ON a.id = s.article_id WHERE a.scrape_run_id = ? ORDER BY a.canonical_url, s.source_url`).bind(runId).all<{ canonical_url: string; source_name: string; source_url: string; published_at: number }>();
  const tags = await env.DB.prepare(`SELECT a.canonical_url, t.tag FROM article_tags t JOIN articles a ON a.id = t.article_id
    WHERE a.scrape_run_id = ? ORDER BY a.canonical_url, t.tag`).bind(runId).all<{ canonical_url: string; tag: string }>();
  const completions = await env.DB.prepare('SELECT chunk_index FROM scrape_chunk_completions WHERE scrape_run_id = ?').bind(runId).all<{ chunk_index: number }>();
  const run = await env.DB.prepare('SELECT * FROM scrape_runs WHERE id = ?').bind(runId).first<RunRow>();
  expect(run).not.toBeNull();
  return { articles: articles.results, sources: sources.results, tags: tags.results, completions: completions.results, run: run! };
}
function expectUsage(run: RunRow) {
  expect(run.tokens_in).toBe(INITIAL_USAGE.input_tokens);
  expect(run.tokens_out).toBe(INITIAL_USAGE.output_tokens);
  // Catalog price contract: provisional Luna prices are zero, not
  // evidence of zero billed spend. Persisted tokens remain observable.
  const model = MODELS.find((entry) => entry.id === DEFAULT_MODEL_ID)!;
  expect(model).toBeDefined();
  const cost = (INITIAL_USAGE.input_tokens * model.inputPricePerMtok + INITIAL_USAGE.output_tokens * model.outputPricePerMtok) / 1_000_000;
  expect(run.estimated_cost_usd).toBeCloseTo(cost, 12);
}
async function expectPersisted(chunk: ChunkJobMessage, expected: string[][]) {
  const saved = await state(chunk.scrape_run_id);
  expect(saved.articles).toHaveLength(expected.length);
  chunk.candidates.forEach((candidate, index) => {
    const row = saved.articles.find((entry) => entry.canonical_url === candidate.canonical_url);
    expect(row).toBeDefined();
    expect(row!.title).toBe(article(index, '').title);
    expect(JSON.parse(row!.details_json)).toEqual(expected[index]);
    expect(JSON.parse(row!.tags_json)).toEqual(article(index, '').tags);
    expect(row!.primary_source_name).toBe(candidate.source_name);
    expect(row!.primary_source_url).toBe(candidate.source_url);
    expect(row!.published_at).toBe(candidate.published_at);
    expect(row!.source_snippet).toBe(candidate.body_snippet);
  });
  expect(saved.sources).toEqual(chunk.candidates.flatMap((candidate) => candidate.alternatives!.map((alt) => ({
    canonical_url: candidate.canonical_url, source_name: alt.source_name, source_url: alt.source_url, published_at: candidate.published_at,
  }))));
  expect(saved.tags).toEqual(chunk.candidates.flatMap((candidate, index) => article(index, '').tags.map((tag) => ({ canonical_url: candidate.canonical_url, tag }))));
  expect(saved.completions).toEqual([{ chunk_index: 0 }]);
  expect(saved.run.status).toBe('ready');
  expect(saved.run.finished_at).not.toBeNull();
  expect(saved.run.finalize_enqueued).toBe(1);
  expect(saved.run.articles_ingested).toBe(expected.length);
  expect(saved.run.articles_deduped).toBe(0);
  expectUsage(saved.run);
}

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.DB_MIGRATIONS ?? []);
  await env.DB.exec('PRAGMA foreign_keys = ON');
});
afterEach(() => vi.unstubAllGlobals());

describe('REQ-PIPE-002 AC5 / REQ-PIPE-015 AC6: 150-word target with a 200-word backstop', () => {
  const overshoots = [
    { words: 151, format: 'string' }, { words: 153, format: 'legacy array' },
    { words: 154, format: 'literal newlines' }, { words: 155, format: 'string' },
    { words: 156, format: 'legacy array' }, { words: 160, format: 'literal newlines' },
  ];
  it.each(overshoots)('retains $words words in $format unchanged with siblings and metadata', async ({ words, format }) => {
    const chunk = await seed(3);
    const original = paragraphs(words, 'original');
    const sibling = paragraphs(130, 'valid');
    const backstopSibling = paragraphs(90, 'backstop');
    const details: Details = format === 'legacy array' ? [original.join('\n')] : original.join('\n\n');
    const output = reply([article(0, details), article(1, sibling.join('\n')), article(2, backstopSibling)]);
    if (format === 'literal newlines') output.content = output.content.replace(/\\n/g, '\n');
    expect(await deliver(runtime(output), chunk)).toBe(Disposition.Ack);
    await expectPersisted(chunk, [original, sibling, backstopSibling]);
  });

  it('maps reordered responses to the original candidates without rewriting tolerated summaries', async () => {
    const chunk = await seed(3);
    const first = paragraphs(151, 'first');
    const second = paragraphs(160, 'second');
    const sibling = paragraphs(99, 'untouched');
    const runtimeEnv = runtime(reply([article(2, sibling), article(1, second), article(0, first)]));
    await expect(processOneChunk(runtimeEnv, chunk)).resolves.toBeUndefined();
    await expectPersisted(chunk, [first, second, sibling]);
  });

  it.each([201, 250])('rejects only a %i-word summary while persisting its valid sibling and completing the chunk', async (words) => {
    const chunk = await seed(2);
    const sibling = paragraphs(150, 'retained');
    expect(await deliver(runtime(reply([article(0, paragraphs(words, 'oversize')), article(1, sibling)])), chunk)).toBe(Disposition.Ack);
    const saved = await state(chunk.scrape_run_id);
    const candidate = chunk.candidates[1]!;
    expect(saved.articles).toEqual([expect.objectContaining({
      canonical_url: candidate.canonical_url,
      title: article(1, '').title,
      details_json: JSON.stringify(sibling),
      tags_json: JSON.stringify(article(1, '').tags),
      primary_source_url: candidate.source_url,
      primary_source_name: candidate.source_name,
      published_at: candidate.published_at,
      source_snippet: candidate.body_snippet,
    })]);
    expect(saved.sources).toEqual(candidate.alternatives!.map((alt) => ({
      canonical_url: candidate.canonical_url, source_name: alt.source_name, source_url: alt.source_url, published_at: candidate.published_at,
    })));
    expect(saved.tags).toEqual(article(1, '').tags.map((tag) => ({ canonical_url: candidate.canonical_url, tag })));
    expect(saved.completions).toEqual([{ chunk_index: 0 }]);
    expect(saved.run.status).toBe('ready');
    expect(saved.run.finished_at).not.toBeNull();
    expect(saved.run.finalize_enqueued).toBe(1);
    expect(saved.run.articles_ingested).toBe(1);
    expect(saved.run.articles_deduped).toBe(1);
    expectUsage(saved.run);
  });

  it.each(['plaintext', 'mixed whitespace and HTML'])('persists exactly 200 normalized words unchanged: %s', async (format) => {
    const chunk = await seed(1);
    const expected = paragraphs(200, 'exact');
    const details = format === 'plaintext' ? expected.join('\n\n') : expected.map((part) =>
      `<p>${part.split(' ').join(' \t  ')}</p>`).join('\r\n\r\n');
    expect(await deliver(runtime(reply([article(0, details)])), chunk)).toBe(Disposition.Ack);
    await expectPersisted(chunk, [expected]);
  });

  it.each([80, 90, 99])('preserves the existing %i-word lower-backstop behavior', async (words) => {
    const chunk = await seed(1);
    const expected = paragraphs(words, 'backstop');
    expect(await deliver(runtime(reply([article(0, expected)])), chunk)).toBe(Disposition.Ack);
    await expectPersisted(chunk, [expected]);
  });
});

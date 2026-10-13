// Behavioral coverage for REQ-PIPE-002 AC5 / CON-LLM-001.
// Initial generation aims for 110-130 words within
// 100-150; otherwise-valid overshoots get one targeted details-only
// correction, not article loss. The existing 80-word backstop stays.
// Real D1/KV; only Gateway, embeddings, Vectorize and queues are stubbed.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { applyD1Migrations, env } from '../fixtures/cloudflare-test';
import { handleChunkBatch, processOneChunk, type ChunkJobMessage } from '~/queue/scrape-chunk-consumer';
import { DEFAULT_MODEL_ID, MODELS } from '~/lib/models';
import { generateUlid } from '~/lib/ulid';

const GATEWAY = 'https://gateway.ai.cloudflare.com/v1/summary-test/account/compat/chat/completions';
const INITIAL_USAGE = { input_tokens: 211, output_tokens: 173 };
const CORRECTION_USAGE = { input_tokens: 89, output_tokens: 67 };
const REDELIVERY_USAGE = { input_tokens: 307, output_tokens: 227 };

// Controlled word boundaries in article prose, rather than truncation
// performed by the consumer. Each paragraph has a distinctive final
// word so exact persisted paragraphs also detect clipping or replacement.
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
interface GatewayReply {
  content: string; usage: typeof INITIAL_USAGE; status?: number;
  observeRequest?: (request: { messages: Array<{ content: string }> }) => void;
}
function reply(articles: unknown[], usage = INITIAL_USAGE): GatewayReply {
  return { content: JSON.stringify({ articles }), usage };
}
function correction(index: number, details: Details) {
  // A correction must not replace the original title/tags or sources.
  return { index, details, title: 'Conflicting unrelated replacement headline', tags: ['robotics'] };
}
function runtime(replies: GatewayReply[]): Env {
  const iterator = replies[Symbol.iterator]();
  vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url !== GATEWAY) throw new Error(`unexpected outbound fetch: ${url}`);
    const next = iterator.next();
    if (next.done) throw new Error('Gateway fixture exhausted');
    next.value.observeRequest?.(JSON.parse(String(init?.body)) as { messages: Array<{ content: string }> });
    return Response.json({ response: next.value.content, usage: next.value.usage }, { status: next.value.status ?? 200 });
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
      body_snippet: PROSE.repeat(4), // long enough to avoid article fetch
      alternatives: [{
        source_url: `https://secondary.example.com/news/${id}/article-${index}`,
        source_name: `Alternative publisher ${index}`,
      }],
    })),
  };
}

enum Disposition { Pending = 'pending', Ack = 'ack', Retry = 'retry', Invalid = 'invalid' }
async function deliver(runtimeEnv: Env, body: ChunkJobMessage, attempts = 1): Promise<Disposition> {
  let disposition = Disposition.Pending;
  const settle = (next: Disposition) => {
    disposition = disposition === Disposition.Pending ? next : Disposition.Invalid;
  };
  const batch = {
    queue: 'scrape-chunks',
    messages: [{ id: `${body.scrape_run_id}:0`, timestamp: new Date(), body, attempts,
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
function expectUsage(run: RunRow, usages: Array<typeof INITIAL_USAGE>) {
  const tokensIn = usages.reduce((total, usage) => total + usage.input_tokens, 0);
  const tokensOut = usages.reduce((total, usage) => total + usage.output_tokens, 0);
  expect(run.tokens_in).toBe(tokensIn);
  expect(run.tokens_out).toBe(tokensOut);
  // Model price contract, not a fabricated positive cost: Luna's
  // provisional catalog prices are zero. Token totals still expose spend.
  const model = MODELS.find((entry) => entry.id === DEFAULT_MODEL_ID)!;
  expect(model).toBeDefined();
  const cost = (tokensIn * model.inputPricePerMtok + tokensOut * model.outputPricePerMtok) / 1_000_000;
  expect(run.estimated_cost_usd).toBeCloseTo(cost, 12);
}
async function expectPersisted(chunk: ChunkJobMessage, expected: string[][], usages: Array<typeof INITIAL_USAGE>) {
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
  expectUsage(saved.run, usages);
}
async function expectRetryState(chunk: ChunkJobMessage, usages: Array<typeof INITIAL_USAGE>) {
  const saved = await state(chunk.scrape_run_id);
  expect(saved.articles).toEqual([]);
  expect(saved.sources).toEqual([]);
  expect(saved.tags).toEqual([]);
  expect(saved.completions).toEqual([]);
  expect(saved.run.status).toBe('running');
  expect(saved.run.finished_at).toBeNull();
  expect(saved.run.finalize_enqueued).toBe(0);
  expect(saved.run.articles_ingested).toBe(0);
  expect(saved.run.articles_deduped).toBe(0);
  expectUsage(saved.run, usages);
}

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.DB_MIGRATIONS ?? []);
  await env.DB.exec('PRAGMA foreign_keys = ON');
});
afterEach(() => vi.unstubAllGlobals());

describe('REQ-PIPE-002 AC5 / CON-LLM-001: preserve legitimate articles through targeted shortening', () => {
  const overshoots = [
    { words: 151, format: 'string' }, { words: 153, format: 'legacy array' },
    { words: 154, format: 'literal newlines' }, { words: 155, format: 'string' },
    { words: 156, format: 'legacy array' }, { words: 160, format: 'literal newlines' },
  ];
  it.each(overshoots)('corrects $words words in $format without clipping, losing siblings, or replacing metadata', async ({ words, format }) => {
    const chunk = await seed(3);
    const long = paragraphs(words, 'original'); // neither paragraph alone exceeds 150
    const corrected = paragraphs(120, 'corrected');
    const sibling = paragraphs(130, 'valid');
    const backstopSibling = paragraphs(90, 'backstop');
    const details: Details = format === 'legacy array' ? [long.join('\n')] : long.join('\n\n');
    const initial = reply([article(0, details), article(1, sibling.join('\n')), article(2, backstopSibling)], INITIAL_USAGE);
    if (format === 'literal newlines') initial.content = initial.content.replace(/\\n/g, '\n');
    let shorteningInput = '';
    const shortening = reply([correction(0, corrected.join('\n\n'))], CORRECTION_USAGE);
    shortening.observeRequest = (request) => {
      shorteningInput = request.messages.map((message) => message.content).join('\n');
    };
    const runtimeEnv = runtime([initial, shortening]);
    expect(await deliver(runtimeEnv, chunk)).toBe(Disposition.Ack);
    // Gateway input-content contract: only overlong details are sent for
    // shortening. These markers are article prose fixtures, not prompt
    // wording or implementation text, and never select a fake outcome.
    expect(shorteningInput).toContain('originallead');
    expect(shorteningInput).toContain('originalconclusion');
    expect(shorteningInput).not.toContain('validlead');
    expect(shorteningInput).not.toContain('validconclusion');
    expect(shorteningInput).not.toContain('backstoplead');
    expect(shorteningInput).not.toContain('backstopconclusion');
    await expectPersisted(chunk, [corrected, sibling, backstopSibling], [INITIAL_USAGE, CORRECTION_USAGE]);
  });

  it('maps reversed correction indices to the original candidates while preserving an untouched sibling', async () => {
    const chunk = await seed(3);
    const first = paragraphs(110, 'firstcorrected');
    const second = paragraphs(130, 'secondcorrected');
    const sibling = paragraphs(99, 'untouched');
    const runtimeEnv = runtime([
      reply([article(2, sibling), article(1, paragraphs(160, 'secondoriginal')), article(0, paragraphs(151, 'firstoriginal'))]),
      reply([correction(1, second), correction(0, first)], CORRECTION_USAGE),
    ]);
    await expect(processOneChunk(runtimeEnv, chunk)).resolves.toBeUndefined();
    await expectPersisted(chunk, [first, second, sibling], [INITIAL_USAGE, CORRECTION_USAGE]);
  });

  it.each([100, 150])('accepts a correction at the inclusive %i-word contract boundary', async (words) => {
    const chunk = await seed(1);
    const corrected = paragraphs(words, 'boundary');
    const runtimeEnv = runtime([reply([article(0, paragraphs(153, 'overshoot'))]), reply([correction(0, corrected)], CORRECTION_USAGE)]);
    expect(await deliver(runtimeEnv, chunk)).toBe(Disposition.Ack);
    await expectPersisted(chunk, [corrected], [INITIAL_USAGE, CORRECTION_USAGE]);
  });

  it.each(['plaintext', 'mixed whitespace and HTML'])('persists exactly 150 normalized words unchanged: %s regression control', async (format) => {
    const chunk = await seed(1);
    const expected = paragraphs(150, 'exact');
    const details = format === 'plaintext' ? expected.join('\n\n') : expected.map((part) =>
      `<p>${part.split(' ').join(' \t  ')}</p>`).join('\r\n\r\n');
    // An unnecessary correction receives a valid but different body,
    // exposing it through persisted content and usage, not request counts.
    const runtimeEnv = runtime([reply([article(0, details)]), reply([correction(0, paragraphs(120, 'unwanted'))], CORRECTION_USAGE)]);
    expect(await deliver(runtimeEnv, chunk)).toBe(Disposition.Ack);
    await expectPersisted(chunk, [expected], [INITIAL_USAGE]);
  });

  it.each([80, 90, 99])('preserves a normal %i-word backstop summary without correction', async (words) => {
    const chunk = await seed(1);
    const expected = paragraphs(words, 'backstop');
    const runtimeEnv = runtime([reply([article(0, expected)]), reply([correction(0, paragraphs(120, 'unwanted'))], CORRECTION_USAGE)]);
    expect(await deliver(runtimeEnv, chunk)).toBe(Disposition.Ack);
    await expectPersisted(chunk, [expected], [INITIAL_USAGE]);
  });
});

const failures: Array<{ name: string; response: GatewayReply; usageAvailable: boolean; secondOvershoot?: boolean }> = [
  { name: 'malformed JSON', response: { content: 'Not a JSON answer', usage: CORRECTION_USAGE }, usageAvailable: true },
  { name: 'missing requested row', response: reply([], CORRECTION_USAGE), usageAvailable: true },
  { name: 'partial correction missing one of two requested rows', response: reply([correction(0, paragraphs(120, 'partial'))], CORRECTION_USAGE), usageAvailable: true, secondOvershoot: true },
  { name: 'missing index', response: reply([{ details: paragraphs(120, 'missingindex') }], CORRECTION_USAGE), usageAvailable: true },
  { name: 'duplicate index', response: reply([correction(0, paragraphs(120, 'duplicateone')), correction(0, paragraphs(120, 'duplicatetwo'))], CORRECTION_USAGE), usageAvailable: true },
  { name: 'unknown index', response: reply([correction(0, paragraphs(120, 'requested')), correction(99, paragraphs(120, 'unknown'))], CORRECTION_USAGE), usageAvailable: true },
  { name: 'unsolicited valid sibling index', response: reply([correction(0, paragraphs(120, 'requested')), correction(1, paragraphs(120, 'unsolicited'))], CORRECTION_USAGE), usageAvailable: true },
  { name: 'still over 150 combined words', response: reply([correction(0, paragraphs(151, 'stilllong'))], CORRECTION_USAGE), usageAvailable: true },
  { name: 'below 100 despite clearing the normal backstop', response: reply([correction(0, paragraphs(99, 'undershoot'))], CORRECTION_USAGE), usageAvailable: true },
  { name: 'below the normal backstop too', response: reply([correction(0, paragraphs(79, 'truncated'))], CORRECTION_USAGE), usageAvailable: true },
  { name: 'provider error without available correction usage', response: { content: 'Provider unavailable', usage: { input_tokens: 0, output_tokens: 0 }, status: 503 }, usageAvailable: false },
];
describe('REQ-PIPE-002 AC5 / CON-LLM-001: atomic failure, spend and redelivery', () => {
  it.each(failures)('$name retries with no articles, sources, tags or completion and records available spend', async ({ response, usageAvailable, secondOvershoot }) => {
    const chunk = await seed(secondOvershoot ? 3 : 2);
    const initialArticles = [article(0, paragraphs(156, 'initial')), article(1, paragraphs(90, 'sibling'))];
    if (secondOvershoot) initialArticles.push(article(2, paragraphs(154, 'secondovershoot')));
    const runtimeEnv = runtime([
      reply(initialArticles),
      response,
      // A second shortening pass must not consume this rescuing output.
      reply([correction(0, paragraphs(120, 'forbiddenrescue'))], REDELIVERY_USAGE),
    ]);
    expect(await deliver(runtimeEnv, chunk)).toBe(Disposition.Retry);
    await expectRetryState(chunk, usageAvailable ? [INITIAL_USAGE, CORRECTION_USAGE] : [INITIAL_USAGE]);
  });

  it.each(['corrected', 'full output'])('redelivery after a failed correction acks %s, persists all articles, and combines failed and successful spend', async (mode) => {
    const chunk = await seed(2);
    const sibling = paragraphs(90, 'sibling');
    const initial = reply([article(0, paragraphs(155, 'initial')), article(1, sibling)]);
    const failed = runtime([initial, reply([correction(0, paragraphs(151, 'failed'))], CORRECTION_USAGE)]);
    expect(await deliver(failed, chunk)).toBe(Disposition.Retry);
    await expectRetryState(chunk, [INITIAL_USAGE, CORRECTION_USAGE]);

    const corrected = paragraphs(120, 'redelivered');
    const replies = mode === 'corrected'
      ? [reply([article(0, paragraphs(154, 'retryovershoot')), article(1, sibling)], REDELIVERY_USAGE), reply([correction(0, corrected)], CORRECTION_USAGE)]
      : [reply([article(0, corrected), article(1, sibling)], REDELIVERY_USAGE)];
    expect(await deliver(runtime(replies), chunk, 2)).toBe(Disposition.Ack);
    await expectPersisted(chunk, [corrected, sibling], mode === 'corrected'
      ? [INITIAL_USAGE, CORRECTION_USAGE, REDELIVERY_USAGE, CORRECTION_USAGE]
      : [INITIAL_USAGE, CORRECTION_USAGE, REDELIVERY_USAGE]);
  });

  it('exhausted uncorrectable delivery retains the existing retry/DLQ disposition without completion or persistence', async () => {
    const chunk = await seed(2);
    const runtimeEnv = runtime([
      reply([article(0, paragraphs(160, 'initial')), article(1, paragraphs(90, 'sibling'))]),
      reply([correction(0, paragraphs(151, 'stilllong'))], CORRECTION_USAGE),
    ]);
    expect(await deliver(runtimeEnv, chunk, 3)).toBe(Disposition.Retry);
    const saved = await state(chunk.scrape_run_id);
    expect(saved.articles).toEqual([]);
    expect(saved.sources).toEqual([]);
    expect(saved.tags).toEqual([]);
    expect(saved.completions).toEqual([]);
    expect(saved.run.status).toBe('failed');
    expect(saved.run.finished_at).not.toBeNull();
    expect(saved.run.articles_ingested).toBe(0);
    expect(saved.run.articles_deduped).toBe(0);
    expect(saved.run.finalize_enqueued).toBe(0);
    expectUsage(saved.run, [INITIAL_USAGE, CORRECTION_USAGE]);
  });
});

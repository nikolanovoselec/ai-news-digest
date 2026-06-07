// Tests for src/lib/llm-json.ts — REQ-PIPE-002 + REQ-PIPE-003 (CF-009).
//
// Single-model architecture (2026-05-06): the helper runs ONE model
// per call. Earlier primary→fallback semantics were removed when the
// project consolidated on a single default model. The previous
// fallback / waste-counter / circuit-breaker tests were removed
// alongside the code that produced them.

import { describe, it, expect, vi } from 'vitest';
import { runJson, previewRawResponse } from '~/lib/llm-json';
import { DEFAULT_MODEL_ID } from '~/lib/models';

const WORKERS_AI_TEST_MODEL = '@cf/openai/gpt-oss-120b';

function makeAi(responses: Array<{ response: string; usage?: { input_tokens?: number; output_tokens?: number } }>) {
  let i = 0;
  return {
    run: vi.fn().mockImplementation(async () => {
      const r = responses[i++];
      if (r === undefined) throw new Error('makeAi: ran out of canned responses');
      return r;
    }),
  };
}

describe('runJson — REQ-PIPE-002 / REQ-PIPE-003', () => {
  it('REQ-PIPE-002: success path returns ok=true with token counts', async () => {
    const ai = makeAi([
      { response: '{"articles": [{"title": "ok"}]}', usage: { input_tokens: 10, output_tokens: 20 } },
    ]);
    const result = await runJson({
      ai,
      model: WORKERS_AI_TEST_MODEL,
      params: { messages: [] },
      narrow: (raw) => (typeof raw === 'string' ? (JSON.parse(raw) as { articles: unknown[] }) : null),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.parsed.articles).toHaveLength(1);
    expect(result.tokensIn).toBe(10);
    expect(result.tokensOut).toBe(20);
    expect(ai.run).toHaveBeenCalledTimes(1);
  });

  it('REQ-PIPE-002: parse failure returns ok=false with attempt info', async () => {
    const ai = makeAi([
      { response: 'malformed not json', usage: { input_tokens: 5, output_tokens: 7 } },
    ]);
    const result = await runJson({
      ai,
      model: WORKERS_AI_TEST_MODEL,
      params: { messages: [] },
      narrow: (raw) => {
        try {
          return typeof raw === 'string' ? (JSON.parse(raw) as { articles: unknown[] }) : null;
        } catch {
          return null;
        }
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.attempt.tokensIn).toBe(5);
    expect(result.attempt.tokensOut).toBe(7);
    expect(result.attempt.rawResponse).toBe('malformed not json');
    expect(ai.run).toHaveBeenCalledTimes(1);
  });

  it('REQ-PIPE-002: model override is honoured', async () => {
    const ai = makeAi([
      { response: '{"x": 1}', usage: { input_tokens: 1, output_tokens: 1 } },
    ]);
    const result = await runJson({
      ai,
      params: { messages: [] },
      narrow: (raw) => (typeof raw === 'string' ? (JSON.parse(raw) as Record<string, unknown>) : null),
      model: 'custom-model',
    });
    expect(ai.run).toHaveBeenCalledTimes(1);
    expect(ai.run.mock.calls[0]?.[0]).toBe('custom-model');
    if (!result.ok) return;
    expect(result.modelUsed).toBe('custom-model');
  });

  it('REQ-PIPE-002: gateway models use AI Gateway compat instead of AI.run when gateway config is present', async () => {
    const ai = makeAi([]);
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"articles": []}' } }],
          usage: { prompt_tokens: 11, completion_tokens: 13, total_tokens: 40 },
        }),
        { status: 200 },
      ),
    );

    const result = await runJson({
      ai,
      aiGatewayApiToken: 'gateway-test-token',
      aiGatewayUrl: 'https://gateway.ai.cloudflare.com/v1/test-account/test-gateway/compat/chat/completions',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      metadata: {
        purpose: 'scrape_chunk',
        scrape_run_id: 'run-1',
        chunk_index: 2,
        total_chunks: 4,
      },
      params: { messages: [{ role: 'user', content: 'json' }] },
      narrow: (raw) => (typeof raw === 'string' ? (JSON.parse(raw) as { articles: unknown[] }) : null),
    });

    expect(ai.run).not.toHaveBeenCalled();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.contexts[0]).toBe(globalThis);
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(String(url)).toContain('/compat/chat/completions');
    expect((init as RequestInit).headers).toMatchObject({
      'cf-aig-authorization': 'Bearer gateway-test-token',
      'cf-aig-skip-cache': 'true',
      'cf-aig-metadata': JSON.stringify({
        purpose: 'scrape_chunk',
        scrape_run_id: 'run-1',
        chunk_index: 2,
        total_chunks: 4,
      }),
    });
    expect(JSON.parse(String((init as RequestInit).body))).toMatchObject({
      model: DEFAULT_MODEL_ID,
      reasoning_effort: 'none',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tokensIn).toBe(11);
    expect(result.tokensOut).toBe(29);
  });

  it('REQ-PIPE-002: gateway models fail closed when gateway config is missing', async () => {
    const ai = makeAi([]);
    const result = await runJson({
      ai,
      params: { messages: [] },
      narrow: () => null,
    });
    expect(ai.run).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.attempt.rawResponse).toEqual({
      error: expect.stringContaining('AI Gateway API token missing'),
    });
  });

  it('returns ok=false with a captured error when ai.run throws (e.g. AiError 3046 timeout)', async () => {
    // Workers AI surfaces request-timeouts and capacity errors as
    // thrown AiError objects. The helper must catch the throw and
    // surface it as `ok: false` so the queue handler can decide
    // whether to retry (single-model architecture: no fallback).
    const aiThrowing = {
      run: vi.fn().mockImplementationOnce(async () => {
        throw new Error('AiError: 3046: Request timeout');
      }),
    };
    const result = await runJson({
      ai: aiThrowing,
      model: WORKERS_AI_TEST_MODEL,
      params: { messages: [] },
      narrow: (raw) => (typeof raw === 'string' ? (JSON.parse(raw) as { articles: unknown[] }) : null),
    });
    expect(aiThrowing.run).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.attempt.rawResponse).toEqual({ error: expect.stringContaining('3046') as unknown });
  });
});

describe('previewRawResponse', () => {
  it('truncates strings to the requested length', () => {
    const long = 'x'.repeat(1000);
    expect(previewRawResponse(long).length).toBe(400);
    expect(previewRawResponse(long, 50).length).toBe(50);
  });

  it('serialises non-string responses through JSON.stringify before truncating', () => {
    const obj = { a: 1, b: 'hello' };
    expect(previewRawResponse(obj)).toBe(JSON.stringify(obj));
  });

  it('handles undefined responses without throwing', () => {
    expect(previewRawResponse(undefined)).toBe('undefined');
  });
});

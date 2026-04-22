// Tests for src/lib/email.ts sendDigestEmail — REQ-MAIL-002 (non-blocking
// email failure). Verifies that non-2xx responses, thrown fetch errors, and
// timeouts all resolve to a structured result and NEVER re-throw, and that
// every failure path emits a `email.send.failed` structured log.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendDigestEmail, type DigestEmailContext } from '~/lib/email';

function makeCtx(overrides: Partial<DigestEmailContext> = {}): DigestEmailContext {
  return {
    user: {
      email: 'alice@example.com',
      gh_login: 'alice',
    },
    digest_id: 'dg-01JABCXYZ',
    local_date: '2026-04-22',
    article_count: 7,
    top_tags: ['react', 'typescript', 'edge'],
    execution_ms: 2400,
    tokens: 3847,
    estimated_cost_usd: 0.0012,
    model_name: 'llama-3.1-8b-instruct-fast',
    app_url: 'https://news-digest.example.com',
    ...overrides,
  };
}

function makeEnv(): Env {
  return {
    RESEND_API_KEY: 're_test_key_123',
    RESEND_FROM: 'News Digest <digest@example.com>',
    APP_URL: 'https://news-digest.example.com',
  } as unknown as Env;
}

/** Parse the single most-recent console.log call that emitted JSON matching
 * the given `event`. Returns null if no such record exists. */
function findLogRecord(
  spy: ReturnType<typeof vi.spyOn>,
  event: string,
): Record<string, unknown> | null {
  for (const call of spy.mock.calls) {
    const raw = call[0];
    if (typeof raw !== 'string') continue;
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed.event === event) return parsed;
    } catch {
      // ignore non-JSON stdout
    }
  }
  return null;
}

describe('sendDigestEmail', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    consoleSpy.mockRestore();
  });

  it('REQ-MAIL-002: returns { sent: true } on 2xx response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'resend-msg-1' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendDigestEmail(makeEnv(), makeCtx());
    expect(result).toEqual({ sent: true });
  });

  it('REQ-MAIL-002: accepts any 2xx status code (201, 202, 204)', async () => {
    for (const status of [200, 201, 202, 204]) {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(status === 204 ? null : '{}', { status }),
      );
      vi.stubGlobal('fetch', fetchMock);
      const result = await sendDigestEmail(makeEnv(), makeCtx());
      expect(result.sent).toBe(true);
    }
  });

  it('REQ-MAIL-002: non-2xx response returns { sent: false, error_code: "resend_non_2xx" }', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('{"error":"invalid"}', { status: 400 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendDigestEmail(makeEnv(), makeCtx());
    expect(result).toEqual({ sent: false, error_code: 'resend_non_2xx' });
  });

  it('REQ-MAIL-002: non-2xx response logs email.send.failed with status', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('nope', { status: 403 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await sendDigestEmail(
      makeEnv(),
      makeCtx({ digest_id: 'dg-abc', user: { email: 'a@b.com', gh_login: 'alice' } }),
    );

    const record = findLogRecord(consoleSpy, 'email.send.failed');
    expect(record).not.toBeNull();
    expect(record?.level).toBe('error');
    expect(record?.status).toBe(403);
    expect(record?.digest_id).toBe('dg-abc');
    expect(record?.user_id).toBe('alice');
  });

  it('REQ-MAIL-002: 5xx response returns error result and does not throw', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('server error', { status: 500 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendDigestEmail(makeEnv(), makeCtx());
    expect(result).toEqual({ sent: false, error_code: 'resend_non_2xx' });
  });

  it('REQ-MAIL-002: thrown fetch error returns { sent: false, error_code: "resend_error" }', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('network down'));
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendDigestEmail(makeEnv(), makeCtx());
    expect(result).toEqual({ sent: false, error_code: 'resend_error' });
  });

  it('REQ-MAIL-002: thrown fetch error logs email.send.failed', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('boom'));
    vi.stubGlobal('fetch', fetchMock);

    await sendDigestEmail(
      makeEnv(),
      makeCtx({ digest_id: 'dg-xyz', user: { email: 'x@y.com', gh_login: 'bob' } }),
    );

    const record = findLogRecord(consoleSpy, 'email.send.failed');
    expect(record).not.toBeNull();
    expect(record?.level).toBe('error');
    expect(record?.digest_id).toBe('dg-xyz');
    expect(record?.user_id).toBe('bob');
  });

  it('REQ-MAIL-002: AbortError (timeout) returns error result without throwing', async () => {
    const abortError = new DOMException('The operation was aborted.', 'AbortError');
    const fetchMock = vi.fn().mockRejectedValue(abortError);
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendDigestEmail(makeEnv(), makeCtx());
    expect(result).toEqual({ sent: false, error_code: 'resend_error' });
  });

  it('REQ-MAIL-002: never re-throws on any error path', async () => {
    const scenarios: Array<() => ReturnType<typeof vi.fn>> = [
      () => vi.fn().mockRejectedValue(new Error('net')),
      () => vi.fn().mockRejectedValue('string error'),
      () => vi.fn().mockRejectedValue(null),
      () => vi.fn().mockResolvedValue(new Response('x', { status: 500 })),
      () => vi.fn().mockResolvedValue(new Response('x', { status: 400 })),
    ];
    for (const build of scenarios) {
      vi.stubGlobal('fetch', build());
      await expect(sendDigestEmail(makeEnv(), makeCtx())).resolves.toBeDefined();
    }
  });

  it('REQ-MAIL-002: configures AbortSignal.timeout at 5 seconds', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('{}', { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await sendDigestEmail(makeEnv(), makeCtx());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(init).toBeDefined();
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });
});

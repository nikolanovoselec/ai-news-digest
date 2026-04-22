// Tests for src/lib/email.ts sendDigestEmail end-to-end payload shape —
// REQ-MAIL-001. Verifies the Resend POST body carries the exact `from`,
// `to`, `subject`, `html`, `text`, and `tags` fields specified by the
// requirement, plus the bearer `Authorization` header.

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

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    RESEND_API_KEY: 're_test_key_123',
    RESEND_FROM: 'News Digest <digest@example.com>',
    APP_URL: 'https://news-digest.example.com',
    ...overrides,
  } as unknown as Env;
}

/** Capture a single fetch call and return the parsed JSON body, URL,
 * and headers for assertion. */
interface CapturedCall {
  url: string;
  init: RequestInit;
  body: Record<string, unknown>;
}

function captureSingleFetch(): { fetchMock: ReturnType<typeof vi.fn>; get: () => CapturedCall } {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ id: 'msg-xyz' }), { status: 200 }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return {
    fetchMock,
    get(): CapturedCall {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const call = fetchMock.mock.calls[0];
      const url = call?.[0] as string;
      const init = call?.[1] as RequestInit;
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      return { url, init, body };
    },
  };
}

describe('sendDigestEmail payload', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('REQ-MAIL-001: POSTs to https://api.resend.com/emails', async () => {
    const cap = captureSingleFetch();
    await sendDigestEmail(makeEnv(), makeCtx());
    const call = cap.get();
    expect(call.url).toBe('https://api.resend.com/emails');
    expect(call.init.method).toBe('POST');
  });

  it('REQ-MAIL-001: sends bearer Authorization header with RESEND_API_KEY', async () => {
    const cap = captureSingleFetch();
    await sendDigestEmail(makeEnv({ RESEND_API_KEY: 're_secret_xyz' }), makeCtx());
    const call = cap.get();
    const headers = new Headers(call.init.headers);
    expect(headers.get('Authorization')).toBe('Bearer re_secret_xyz');
  });

  it('REQ-MAIL-001: sends Content-Type: application/json', async () => {
    const cap = captureSingleFetch();
    await sendDigestEmail(makeEnv(), makeCtx());
    const call = cap.get();
    const headers = new Headers(call.init.headers);
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('REQ-MAIL-001: payload.from equals env.RESEND_FROM', async () => {
    const cap = captureSingleFetch();
    await sendDigestEmail(
      makeEnv({ RESEND_FROM: 'News Digest <digest@example.com>' }),
      makeCtx(),
    );
    const call = cap.get();
    expect(call.body.from).toBe('News Digest <digest@example.com>');
  });

  it('REQ-MAIL-001: payload.to is an array containing the user email', async () => {
    const cap = captureSingleFetch();
    await sendDigestEmail(
      makeEnv(),
      makeCtx({ user: { email: 'recipient@example.com', gh_login: 'alice' } }),
    );
    const call = cap.get();
    expect(Array.isArray(call.body.to)).toBe(true);
    expect(call.body.to).toEqual(['recipient@example.com']);
  });

  it('REQ-MAIL-001: payload.subject matches "Your news digest is ready \u00b7 {N} stories"', async () => {
    const cap = captureSingleFetch();
    await sendDigestEmail(makeEnv(), makeCtx({ article_count: 9 }));
    const call = cap.get();
    expect(call.body.subject).toBe('Your news digest is ready \u00b7 9 stories');
  });

  it('REQ-MAIL-001: payload.html is a non-empty string containing HTML markup', async () => {
    const cap = captureSingleFetch();
    await sendDigestEmail(makeEnv(), makeCtx());
    const call = cap.get();
    const html = call.body.html as string;
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain('<html>');
    expect(html).toContain('Your daily digest is ready');
  });

  it('REQ-MAIL-001: payload.text is a non-empty plaintext fallback', async () => {
    const cap = captureSingleFetch();
    await sendDigestEmail(makeEnv(), makeCtx());
    const call = cap.get();
    const text = call.body.text as string;
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain('Your daily digest is ready.');
    expect(text).not.toMatch(/<[a-z]/i);
  });

  it('REQ-MAIL-001: payload.tags contains { name: "kind", value: "daily-digest" }', async () => {
    const cap = captureSingleFetch();
    await sendDigestEmail(makeEnv(), makeCtx());
    const call = cap.get();
    expect(call.body.tags).toEqual([{ name: 'kind', value: 'daily-digest' }]);
  });

  it('REQ-MAIL-001: payload body is valid JSON with exactly the documented keys', async () => {
    const cap = captureSingleFetch();
    await sendDigestEmail(makeEnv(), makeCtx());
    const call = cap.get();
    expect(Object.keys(call.body).sort()).toEqual(
      ['from', 'html', 'subject', 'tags', 'text', 'to'].sort(),
    );
  });

  it('REQ-MAIL-001: request carries an AbortSignal (5s timeout)', async () => {
    const cap = captureSingleFetch();
    await sendDigestEmail(makeEnv(), makeCtx());
    const call = cap.get();
    expect(call.init.signal).toBeInstanceOf(AbortSignal);
  });
});

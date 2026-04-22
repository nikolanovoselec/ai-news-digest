// Tests for src/pages/api/auth/set-tz.ts — REQ-SET-007 (timezone change
// detection update endpoint) + REQ-AUTH-003 (Origin check).

import { describe, it, expect, vi } from 'vitest';
import { POST } from '~/pages/api/auth/set-tz';
import { SESSION_COOKIE_NAME } from '~/middleware/auth';
import { signSession } from '~/lib/session-jwt';

const JWT_SECRET = 'test-secret-for-hmac-sha256-signing-minimum-length';
const APP_URL = 'https://news-digest.example.com';
const APP_ORIGIN = 'https://news-digest.example.com';

interface UserRow {
  id: string;
  email: string;
  gh_login: string;
  tz: string;
  digest_hour: number | null;
  digest_minute: number;
  hashtags_json: string | null;
  model_id: string | null;
  email_enabled: number;
  session_version: number;
}

function baseRow(): UserRow {
  return {
    id: '12345',
    email: 'alice@example.com',
    gh_login: 'alice',
    tz: 'Europe/Zurich',
    digest_hour: 8,
    digest_minute: 0,
    hashtags_json: '["#ai"]',
    model_id: '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
    email_enabled: 1,
    session_version: 1,
  };
}

function makeDb(row: UserRow | null): {
  db: D1Database;
  runCalls: { sql: string; params: unknown[] }[];
} {
  const runCalls: { sql: string; params: unknown[] }[] = [];
  const prepareSpy = vi.fn().mockImplementation((sql: string) => ({
    bind: (...params: unknown[]) => ({
      first: vi.fn().mockResolvedValue(sql.startsWith('SELECT') ? row : null),
      run: vi.fn().mockImplementation(async () => {
        runCalls.push({ sql, params });
        return { success: true, meta: { changes: 1 } };
      }),
    }),
  }));
  const db = { prepare: prepareSpy } as unknown as D1Database;
  return { db, runCalls };
}

function env(db: D1Database): Partial<Env> {
  return {
    APP_URL,
    OAUTH_JWT_SECRET: JWT_SECRET,
    DB: db,
  };
}

function makeContext(request: Request, e: Partial<Env>): unknown {
  return {
    request,
    locals: { runtime: { env: e as Env } },
    url: new URL(request.url),
  };
}

async function setTzRequest(
  options: {
    origin?: string | null;
    cookie?: string | null;
    body?: unknown;
    rawBody?: string;
  } = {},
): Promise<Request> {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (options.origin !== null && options.origin !== undefined) {
    headers.set('Origin', options.origin);
  }
  if (options.cookie !== null && options.cookie !== undefined) {
    headers.set('Cookie', options.cookie);
  }
  const init: RequestInit = { method: 'POST', headers };
  if (options.rawBody !== undefined) {
    init.body = options.rawBody;
  } else if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }
  return new Request(`${APP_URL}/api/auth/set-tz`, init);
}

describe('POST /api/auth/set-tz', () => {
  it('REQ-AUTH-003: rejects POST with missing Origin header', async () => {
    const { db } = makeDb(baseRow());
    const req = await setTzRequest({ origin: null, body: { tz: 'UTC' } });
    const res = await POST(makeContext(req, env(db)) as never);
    expect(res.status).toBe(403);
  });

  it('REQ-SET-007: returns 401 when not authenticated', async () => {
    const { db } = makeDb(baseRow());
    const req = await setTzRequest({
      origin: APP_ORIGIN,
      body: { tz: 'UTC' },
    });
    const res = await POST(makeContext(req, env(db)) as never);
    expect(res.status).toBe(401);
  });

  it('REQ-SET-007: rejects invalid tz identifier with 400', async () => {
    const token = await signSession(
      { sub: '12345', email: 'a@b.c', ghl: 'a', sv: 1 },
      JWT_SECRET,
    );
    const { db } = makeDb(baseRow());
    const req = await setTzRequest({
      origin: APP_ORIGIN,
      cookie: `${SESSION_COOKIE_NAME}=${token}`,
      body: { tz: 'Mars/Olympus_Mons' },
    });
    const res = await POST(makeContext(req, env(db)) as never);
    expect(res.status).toBe(400);
    expect((await res.json())).toMatchObject({ code: 'invalid_tz' });
  });

  it('REQ-SET-007: rejects non-string tz with 400', async () => {
    const token = await signSession(
      { sub: '12345', email: 'a@b.c', ghl: 'a', sv: 1 },
      JWT_SECRET,
    );
    const { db } = makeDb(baseRow());
    const req = await setTzRequest({
      origin: APP_ORIGIN,
      cookie: `${SESSION_COOKIE_NAME}=${token}`,
      body: { tz: 42 },
    });
    const res = await POST(makeContext(req, env(db)) as never);
    expect(res.status).toBe(400);
  });

  it('REQ-SET-007: rejects empty-string tz with 400', async () => {
    const token = await signSession(
      { sub: '12345', email: 'a@b.c', ghl: 'a', sv: 1 },
      JWT_SECRET,
    );
    const { db } = makeDb(baseRow());
    const req = await setTzRequest({
      origin: APP_ORIGIN,
      cookie: `${SESSION_COOKIE_NAME}=${token}`,
      body: { tz: '' },
    });
    const res = await POST(makeContext(req, env(db)) as never);
    expect(res.status).toBe(400);
  });

  it('REQ-SET-007: rejects non-JSON body with 400', async () => {
    const token = await signSession(
      { sub: '12345', email: 'a@b.c', ghl: 'a', sv: 1 },
      JWT_SECRET,
    );
    const { db } = makeDb(baseRow());
    const req = await setTzRequest({
      origin: APP_ORIGIN,
      cookie: `${SESSION_COOKIE_NAME}=${token}`,
      rawBody: 'not-json',
    });
    const res = await POST(makeContext(req, env(db)) as never);
    expect(res.status).toBe(400);
    expect((await res.json())).toMatchObject({ code: 'bad_request' });
  });

  it('REQ-SET-007: persists a valid IANA timezone to users.tz', async () => {
    const token = await signSession(
      { sub: '12345', email: 'a@b.c', ghl: 'a', sv: 1 },
      JWT_SECRET,
    );
    const { db, runCalls } = makeDb(baseRow());
    const req = await setTzRequest({
      origin: APP_ORIGIN,
      cookie: `${SESSION_COOKIE_NAME}=${token}`,
      body: { tz: 'America/New_York' },
    });
    const res = await POST(makeContext(req, env(db)) as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; tz: string };
    expect(body.ok).toBe(true);
    expect(body.tz).toBe('America/New_York');
    const update = runCalls.find((c) => c.sql.startsWith('UPDATE users SET tz'));
    expect(update).toBeDefined();
    expect(update!.params[0]).toBe('America/New_York');
    expect(update!.params[1]).toBe('12345');
  });

  it('REQ-SET-007: accepts UTC alias', async () => {
    const token = await signSession(
      { sub: '12345', email: 'a@b.c', ghl: 'a', sv: 1 },
      JWT_SECRET,
    );
    const { db } = makeDb(baseRow());
    const req = await setTzRequest({
      origin: APP_ORIGIN,
      cookie: `${SESSION_COOKIE_NAME}=${token}`,
      body: { tz: 'UTC' },
    });
    const res = await POST(makeContext(req, env(db)) as never);
    expect(res.status).toBe(200);
  });
});

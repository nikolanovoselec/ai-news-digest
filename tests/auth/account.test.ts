// Tests for src/pages/api/auth/account.ts — REQ-AUTH-005 (account
// deletion with explicit confirmation, D1 cascade, KV cleanup, cookie
// clear) + REQ-AUTH-003 (Origin check).

import { describe, it, expect, vi } from 'vitest';
import { DELETE } from '~/pages/api/auth/account';
import { SESSION_COOKIE_NAME } from '~/middleware/auth';
import { signSession } from '~/lib/session-jwt';

/** Collect every Set-Cookie value from a Response. */
function setCookiesOf(res: Response): string[] {
  const h = res.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof h.getSetCookie === 'function') return h.getSetCookie();
  const raw = h.get('Set-Cookie');
  return raw === null ? [] : [raw];
}

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

/** Build a D1 stub where the user row is returned on SELECT, DELETE
 * records its bound parameter, and PRAGMA is a no-op. */
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
        return {
          success: true,
          meta: { changes: sql.startsWith('DELETE') && row !== null ? 1 : 0 },
        };
      }),
    }),
  }));
  const exec = vi.fn().mockResolvedValue(undefined);
  const db = { prepare: prepareSpy, exec } as unknown as D1Database;
  return { db, runCalls };
}

function makeKv(): { kv: KVNamespace; deleted: string[] } {
  const deleted: string[] = [];
  const kv = {
    list: vi.fn().mockResolvedValue({
      keys: [{ name: 'user:12345:pref' }, { name: 'user:12345:banner-dismiss' }],
      list_complete: true,
    }),
    delete: vi.fn().mockImplementation(async (name: string) => {
      deleted.push(name);
    }),
  } as unknown as KVNamespace;
  return { kv, deleted };
}

function env(db: D1Database, kv: KVNamespace): Partial<Env> {
  return {
    APP_URL,
    OAUTH_JWT_SECRET: JWT_SECRET,
    DB: db,
    KV: kv,
  };
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

async function deleteRequest(
  options: {
    origin?: string | null;
    cookie?: string | null;
    body?: unknown;
  } = {},
): Promise<Request> {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (options.origin !== null && options.origin !== undefined) {
    headers.set('Origin', options.origin);
  }
  if (options.cookie !== null && options.cookie !== undefined) {
    headers.set('Cookie', options.cookie);
  }
  return new Request(`${APP_URL}/api/auth/account`, {
    method: 'DELETE',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

function makeContext(request: Request, e: Partial<Env>): unknown {
  return {
    request,
    locals: { runtime: { env: e as Env } },
    url: new URL(request.url),
  };
}

describe('DELETE /api/auth/account', () => {
  it('REQ-AUTH-003: rejects DELETE with missing Origin header', async () => {
    const { db } = makeDb(baseRow());
    const { kv } = makeKv();
    const req = await deleteRequest({ origin: null, body: { confirm: 'DELETE' } });
    const res = await DELETE(makeContext(req, env(db, kv)) as never);
    expect(res.status).toBe(403);
  });

  it('REQ-AUTH-005: returns 401 when there is no session', async () => {
    const { db } = makeDb(baseRow());
    const { kv } = makeKv();
    const req = await deleteRequest({
      origin: APP_ORIGIN,
      body: { confirm: 'DELETE' },
    });
    const res = await DELETE(makeContext(req, env(db, kv)) as never);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({ code: 'unauthorized' });
  });

  it('REQ-AUTH-005: returns 400 when confirm field is missing', async () => {
    const token = await signSession(
      { sub: '12345', email: 'a@b.c', ghl: 'a', sv: 1 },
      JWT_SECRET,
    );
    const { db } = makeDb(baseRow());
    const { kv } = makeKv();
    const req = await deleteRequest({
      origin: APP_ORIGIN,
      cookie: `${SESSION_COOKIE_NAME}=${token}`,
      body: {},
    });
    const res = await DELETE(makeContext(req, env(db, kv)) as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ code: 'confirmation_required' });
  });

  it('REQ-AUTH-005: returns 400 when confirm value is not exactly "DELETE"', async () => {
    const token = await signSession(
      { sub: '12345', email: 'a@b.c', ghl: 'a', sv: 1 },
      JWT_SECRET,
    );
    const { db } = makeDb(baseRow());
    const { kv } = makeKv();
    const req = await deleteRequest({
      origin: APP_ORIGIN,
      cookie: `${SESSION_COOKIE_NAME}=${token}`,
      body: { confirm: 'delete' }, // lowercase
    });
    const res = await DELETE(makeContext(req, env(db, kv)) as never);
    expect(res.status).toBe(400);
  });

  it('REQ-AUTH-005: returns 400 when the body is not JSON', async () => {
    const token = await signSession(
      { sub: '12345', email: 'a@b.c', ghl: 'a', sv: 1 },
      JWT_SECRET,
    );
    const { db } = makeDb(baseRow());
    const { kv } = makeKv();
    const req = new Request(`${APP_URL}/api/auth/account`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Origin: APP_ORIGIN,
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
      body: 'not json',
    });
    const res = await DELETE(makeContext(req, env(db, kv)) as never);
    expect(res.status).toBe(400);
    expect((await res.json())).toMatchObject({ code: 'bad_request' });
  });

  it('REQ-AUTH-005: deletes the users row (cascade handled by FK ON DELETE CASCADE)', async () => {
    const token = await signSession(
      { sub: '12345', email: 'a@b.c', ghl: 'a', sv: 1 },
      JWT_SECRET,
    );
    const { db, runCalls } = makeDb(baseRow());
    const { kv } = makeKv();
    const req = await deleteRequest({
      origin: APP_ORIGIN,
      cookie: `${SESSION_COOKIE_NAME}=${token}`,
      body: { confirm: 'DELETE' },
    });
    const res = await DELETE(makeContext(req, env(db, kv)) as never);
    expect(res.status).toBe(200);
    const del = runCalls.find((c) => c.sql.startsWith('DELETE FROM users'));
    expect(del).toBeDefined();
    expect(del!.params[0]).toBe('12345');
  });

  it('REQ-AUTH-005: clears the session cookie on successful delete', async () => {
    const token = await signSession(
      { sub: '12345', email: 'a@b.c', ghl: 'a', sv: 1 },
      JWT_SECRET,
    );
    const { db } = makeDb(baseRow());
    const { kv } = makeKv();
    const req = await deleteRequest({
      origin: APP_ORIGIN,
      cookie: `${SESSION_COOKIE_NAME}=${token}`,
      body: { confirm: 'DELETE' },
    });
    const res = await DELETE(makeContext(req, env(db, kv)) as never);
    const clear = setCookiesOf(res).find(
      (c) => c.startsWith(`${SESSION_COOKIE_NAME}=`) && c.includes('Max-Age=0'),
    );
    expect(clear).toBeDefined();
  });

  it('REQ-AUTH-005: removes KV entries namespaced to user:<id>:', async () => {
    const token = await signSession(
      { sub: '12345', email: 'a@b.c', ghl: 'a', sv: 1 },
      JWT_SECRET,
    );
    const { db } = makeDb(baseRow());
    const { kv, deleted } = makeKv();
    const req = await deleteRequest({
      origin: APP_ORIGIN,
      cookie: `${SESSION_COOKIE_NAME}=${token}`,
      body: { confirm: 'DELETE' },
    });
    await DELETE(makeContext(req, env(db, kv)) as never);
    expect(deleted).toContain('user:12345:pref');
    expect(deleted).toContain('user:12345:banner-dismiss');
  });

  it('REQ-AUTH-005: returns redirect hint in JSON body', async () => {
    const token = await signSession(
      { sub: '12345', email: 'a@b.c', ghl: 'a', sv: 1 },
      JWT_SECRET,
    );
    const { db } = makeDb(baseRow());
    const { kv } = makeKv();
    const req = await deleteRequest({
      origin: APP_ORIGIN,
      cookie: `${SESSION_COOKIE_NAME}=${token}`,
      body: { confirm: 'DELETE' },
    });
    const res = await DELETE(makeContext(req, env(db, kv)) as never);
    const body = (await res.json()) as { ok: boolean; redirect: string };
    expect(body.ok).toBe(true);
    expect(body.redirect).toBe(`/?account_deleted=1`);
  });
});

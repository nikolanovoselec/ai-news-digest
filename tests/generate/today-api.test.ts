// Tests for src/pages/api/digest/today.ts — REQ-READ-005.
//
// Covers:
//   - Unauth → 401
//   - Returns the newest digest for the user with articles
//   - live=true when status='in_progress'
//   - next_scheduled_at computed when newest digest is not today's local_date
//   - next_scheduled_at is null when the newest digest IS today's

import { describe, it, expect, vi } from 'vitest';
import { GET } from '~/pages/api/digest/today';
import { SESSION_COOKIE_NAME } from '~/middleware/auth';
import { signSession } from '~/lib/session-jwt';

const JWT_SECRET = 'test-secret-for-hmac-sha256-signing-minimum-length';
const APP_URL = 'https://news-digest.example.com';

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

interface DigestRow {
  id: string;
  user_id: string;
  local_date: string;
  generated_at: number;
  execution_ms: number | null;
  tokens_in: number | null;
  tokens_out: number | null;
  estimated_cost_usd: number | null;
  model_id: string;
  status: string;
  error_code: string | null;
  trigger: string;
}

function baseUser(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: 'user-1',
    email: 'a@b.c',
    gh_login: 'alice',
    tz: 'UTC',
    digest_hour: 8,
    digest_minute: 0,
    hashtags_json: JSON.stringify(['ai']),
    model_id: '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
    email_enabled: 1,
    session_version: 1,
    ...overrides,
  };
}

function makeDb(
  user: UserRow | null,
  digest: DigestRow | null,
  articles: unknown[] = [],
): D1Database {
  const prepare = vi.fn().mockImplementation((sql: string) => ({
    bind: (..._params: unknown[]) => ({
      first: vi.fn().mockImplementation(async () => {
        if (sql.startsWith('SELECT id, email, gh_login')) return user;
        if (sql.includes('FROM digests') && sql.includes('ORDER BY generated_at')) {
          return digest;
        }
        return null;
      }),
      run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 0 } }),
      all: vi.fn().mockImplementation(async () => {
        if (sql.startsWith('SELECT') && sql.includes('FROM articles')) {
          return { success: true, results: articles };
        }
        return { success: true, results: [] };
      }),
    }),
  }));
  return { prepare } as unknown as D1Database;
}

function makeEnv(db: D1Database): Partial<Env> {
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
    params: {},
  };
}

async function authedRequest(): Promise<Request> {
  const token = await signSession(
    { sub: 'user-1', email: 'a@b.c', ghl: 'alice', sv: 1 },
    JWT_SECRET,
  );
  return new Request(`${APP_URL}/api/digest/today`, {
    method: 'GET',
    headers: { Cookie: `${SESSION_COOKIE_NAME}=${token}` },
  });
}

describe('GET /api/digest/today', () => {
  it('REQ-READ-005: returns 401 without a session', async () => {
    const db = makeDb(null, null);
    const req = new Request(`${APP_URL}/api/digest/today`, { method: 'GET' });
    const res = await GET(makeContext(req, makeEnv(db)) as never);
    expect(res.status).toBe(401);
  });

  it('REQ-READ-005: returns { digest, articles, live, next_scheduled_at } shape', async () => {
    const now = Math.floor(Date.now() / 1000);
    const digest: DigestRow = {
      id: 'd1',
      user_id: 'user-1',
      local_date: '2000-01-01', // past date so next_scheduled_at is set
      generated_at: now - 3600,
      execution_ms: 1200,
      tokens_in: 500,
      tokens_out: 200,
      estimated_cost_usd: 0.001,
      model_id: '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
      status: 'ready',
      error_code: null,
      trigger: 'scheduled',
    };
    const articles = [
      { id: 'a1', digest_id: 'd1', slug: 's', title: 't', one_liner: 'l', details_json: '[]', source_url: 'https://e/1', source_name: 'hn', published_at: now, rank: 1, read_at: null },
    ];
    const db = makeDb(baseUser(), digest, articles);

    const req = await authedRequest();
    const res = await GET(makeContext(req, makeEnv(db)) as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      digest: DigestRow;
      articles: unknown[];
      live: boolean;
      next_scheduled_at: number | null;
    };
    expect(body.digest.id).toBe('d1');
    expect(body.articles).toHaveLength(1);
    expect(body.live).toBe(false);
    expect(typeof body.next_scheduled_at).toBe('number');
  });

  it('REQ-READ-005: live=true when digest.status=in_progress', async () => {
    const now = Math.floor(Date.now() / 1000);
    const digest: DigestRow = {
      id: 'd1',
      user_id: 'user-1',
      local_date: '2000-01-01', // past; doesn't matter because live overrides
      generated_at: now - 30,
      execution_ms: null,
      tokens_in: null,
      tokens_out: null,
      estimated_cost_usd: null,
      model_id: '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
      status: 'in_progress',
      error_code: null,
      trigger: 'manual',
    };
    const db = makeDb(baseUser(), digest, []);
    const req = await authedRequest();
    const res = await GET(makeContext(req, makeEnv(db)) as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      live: boolean;
      next_scheduled_at: number | null;
    };
    expect(body.live).toBe(true);
    // When live, next_scheduled_at is null — user is in the middle of
    // today's generation.
    expect(body.next_scheduled_at).toBeNull();
  });

  it('REQ-READ-005: next_scheduled_at is null when newest digest is today', async () => {
    // Compute today's local_date in UTC dynamically so the test does
    // not depend on a frozen clock.
    const now = Math.floor(Date.now() / 1000);
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(now * 1000));
    const digest: DigestRow = {
      id: 'd1',
      user_id: 'user-1',
      local_date: today,
      generated_at: now - 60,
      execution_ms: 1200,
      tokens_in: 100,
      tokens_out: 100,
      estimated_cost_usd: 0.001,
      model_id: '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
      status: 'ready',
      error_code: null,
      trigger: 'scheduled',
    };
    const db = makeDb(baseUser({ tz: 'UTC' }), digest, []);
    const req = await authedRequest();
    const res = await GET(makeContext(req, makeEnv(db)) as never);
    const body = (await res.json()) as { next_scheduled_at: number | null };
    expect(body.next_scheduled_at).toBeNull();
  });

  it('REQ-READ-005: no digest → null digest + first-run next_scheduled_at is in the future', async () => {
    const db = makeDb(baseUser({ tz: 'UTC', digest_hour: 8, digest_minute: 0 }), null, []);
    const req = await authedRequest();
    const res = await GET(makeContext(req, makeEnv(db)) as never);
    const body = (await res.json()) as {
      digest: unknown;
      next_scheduled_at: number | null;
    };
    expect(body.digest).toBeNull();
    expect(typeof body.next_scheduled_at).toBe('number');
    const now = Math.floor(Date.now() / 1000);
    const diff = body.next_scheduled_at! - now;
    // Next scheduled is somewhere in the next 24h (either today or tomorrow).
    expect(diff).toBeGreaterThan(0);
    expect(diff).toBeLessThanOrEqual(24 * 60 * 60);
  });

  it('REQ-READ-005: next_scheduled_at is null if the user has never picked a digest_hour', async () => {
    const db = makeDb(
      baseUser({ digest_hour: null, digest_minute: 0 }),
      null,
      [],
    );
    const req = await authedRequest();
    const res = await GET(makeContext(req, makeEnv(db)) as never);
    const body = (await res.json()) as { next_scheduled_at: number | null };
    expect(body.next_scheduled_at).toBeNull();
  });
});

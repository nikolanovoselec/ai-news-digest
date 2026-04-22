// Tests for src/pages/api/stats.ts — REQ-HIST-002.
//
// The stats widget runs four user-scoped queries. Every assertion
// confirms the user_id filter is bound and that the totals are
// returned verbatim.

import { describe, it, expect, vi } from 'vitest';
import { GET } from '~/pages/api/stats';
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

function baseUser(): UserRow {
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
  };
}

/** Row returned for each tile. The stats route reads `n` from every
 * query; the stubs all return a single-row `{ n }`. */
interface Responses {
  digestsN?: number;
  articlesReadN?: number;
  articlesTotalN?: number;
  tokensN?: number;
  costN?: number;
}

function makeDb(user: UserRow | null, resp: Responses = {}): {
  db: D1Database;
  firstCalls: { sql: string; params: unknown[] }[];
} {
  const firstCalls: { sql: string; params: unknown[] }[] = [];
  const prepare = vi.fn().mockImplementation((sql: string) => ({
    bind: (...params: unknown[]) => ({
      first: vi.fn().mockImplementation(async () => {
        if (sql.startsWith('SELECT id, email, gh_login')) return user;
        firstCalls.push({ sql, params });
        if (sql.includes('FROM digests') && sql.includes('status =')) {
          // Could be digests_generated, tokens, or cost tile.
          if (sql.includes('COUNT(*)')) return { n: resp.digestsN ?? 0 };
          if (sql.includes('tokens_in')) return { n: resp.tokensN ?? 0 };
          if (sql.includes('estimated_cost_usd')) return { n: resp.costN ?? 0 };
        }
        if (sql.includes('a.read_at IS NOT NULL')) {
          return { n: resp.articlesReadN ?? 0 };
        }
        if (sql.includes('FROM articles a') && sql.includes('JOIN digests')) {
          return { n: resp.articlesTotalN ?? 0 };
        }
        return { n: 0 };
      }),
      run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 0 } }),
      all: vi.fn().mockResolvedValue({ results: [] }),
    }),
  }));
  const db = { prepare } as unknown as D1Database;
  return { db, firstCalls };
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
  return new Request(`${APP_URL}/api/stats`, {
    method: 'GET',
    headers: { Cookie: `${SESSION_COOKIE_NAME}=${token}` },
  });
}

describe('GET /api/stats', () => {
  it('REQ-HIST-002: returns 401 without a session', async () => {
    const { db } = makeDb(null);
    const req = new Request(`${APP_URL}/api/stats`, { method: 'GET' });
    const res = await GET(makeContext(req, makeEnv(db)) as never);
    expect(res.status).toBe(401);
  });

  it('REQ-HIST-002: returns four tile values for the session user', async () => {
    const { db } = makeDb(baseUser(), {
      digestsN: 14,
      articlesReadN: 38,
      articlesTotalN: 140,
      tokensN: 125_000,
      costN: 0.42,
    });
    const req = await authedRequest();
    const res = await GET(makeContext(req, makeEnv(db)) as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      digests_generated: number;
      articles_read: number;
      articles_total: number;
      tokens_consumed: number;
      cost_usd: number;
    };
    expect(body.digests_generated).toBe(14);
    expect(body.articles_read).toBe(38);
    expect(body.articles_total).toBe(140);
    expect(body.tokens_consumed).toBe(125_000);
    expect(body.cost_usd).toBe(0.42);
  });

  it('REQ-HIST-002: every tile query binds user_id = session user', async () => {
    const { db, firstCalls } = makeDb(baseUser());
    const req = await authedRequest();
    await GET(makeContext(req, makeEnv(db)) as never);

    // Four tile queries, all with user_id as the first bound parameter.
    expect(firstCalls.length).toBeGreaterThanOrEqual(4);
    for (const call of firstCalls) {
      expect(call.params[0]).toBe('user-1');
    }
  });

  it('REQ-HIST-002: article queries JOIN through digests with d.user_id filter (IDOR-safe)', async () => {
    const { db, firstCalls } = makeDb(baseUser());
    const req = await authedRequest();
    await GET(makeContext(req, makeEnv(db)) as never);

    const articleQueries = firstCalls.filter((c) => c.sql.includes('FROM articles'));
    expect(articleQueries.length).toBeGreaterThanOrEqual(2);
    for (const q of articleQueries) {
      expect(q.sql).toContain('JOIN digests');
      expect(q.sql).toContain('d.user_id = ?1');
    }
  });

  it('REQ-HIST-002: zero rows → zero tiles, not null', async () => {
    const { db } = makeDb(baseUser()); // all defaults to 0
    const req = await authedRequest();
    const res = await GET(makeContext(req, makeEnv(db)) as never);
    const body = (await res.json()) as Record<string, number>;
    expect(body.digests_generated).toBe(0);
    expect(body.articles_read).toBe(0);
    expect(body.articles_total).toBe(0);
    expect(body.tokens_consumed).toBe(0);
    expect(body.cost_usd).toBe(0);
  });
});

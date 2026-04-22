// Tests for src/pages/api/history.ts — REQ-HIST-001.
//
// Verifies:
//   - offset pagination binds the parsed `offset` query param
//   - the SELECT contains the correlated-subquery article_count
//   - has_more is true iff a peek row past LIMIT exists
//   - the query is user-scoped (IDOR-safe) — the bound params carry the
//     session user_id as the first positional arg

import { describe, it, expect, vi } from 'vitest';
import { GET } from '~/pages/api/history';
import { SESSION_COOKIE_NAME } from '~/middleware/auth';
import { signSession } from '~/lib/session-jwt';

const JWT_SECRET = 'test-secret-for-hmac-sha256-signing-minimum-length';
const APP_URL = 'https://news-digest.example.com';
const MODEL_ID = '@cf/meta/llama-3.1-8b-instruct-fp8-fast';

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
  article_count: number;
}

function baseRow(): UserRow {
  return {
    id: '12345',
    email: 'alice@example.com',
    gh_login: 'alice',
    tz: 'Europe/Zurich',
    digest_hour: 8,
    digest_minute: 0,
    hashtags_json: '["ai"]',
    model_id: MODEL_ID,
    email_enabled: 1,
    session_version: 1,
  };
}

/** Build a synthetic digest row with the given id and index for ordering. */
function fakeDigest(id: string, generatedAt: number, articleCount: number): DigestRow {
  return {
    id,
    user_id: '12345',
    local_date: '2026-04-22',
    generated_at: generatedAt,
    execution_ms: 1234,
    tokens_in: 500,
    tokens_out: 800,
    estimated_cost_usd: 0.14,
    model_id: MODEL_ID,
    status: 'completed',
    error_code: null,
    trigger: 'scheduled',
    article_count: articleCount,
  };
}

/**
 * D1 stub:
 *   - SELECT id, email, gh_login, ... -> authRow (auth middleware)
 *   - SELECT d.*, (SELECT COUNT(*) FROM articles ...) FROM digests d ...
 *     -> `digests` (history read)
 * Captures bound params on every prepare().bind() call so tests can
 * assert pagination params and user_id scoping.
 */
function makeDb(
  authRow: UserRow | null,
  digests: DigestRow[],
): {
  db: D1Database;
  bindings: { sql: string; params: unknown[] }[];
} {
  const bindings: { sql: string; params: unknown[] }[] = [];
  const prepareSpy = vi.fn().mockImplementation((sql: string) => {
    const stmt = {
      _sql: sql,
      _params: [] as unknown[],
      bind(...params: unknown[]) {
        stmt._params = params;
        bindings.push({ sql, params });
        return stmt;
      },
      first: vi.fn().mockImplementation(async () => {
        if (sql.startsWith('SELECT id, email, gh_login')) return authRow;
        return null;
      }),
      all: vi.fn().mockImplementation(async () => {
        if (sql.startsWith('SELECT d.*')) {
          // Apply the LIMIT/OFFSET bound params so the stub's output
          // reflects what the real D1 would return — this is how
          // has_more's peek-row semantics get exercised.
          const [, limitRaw, offsetRaw] = stmt._params as [
            unknown,
            number,
            number,
          ];
          const limit = typeof limitRaw === 'number' ? limitRaw : 31;
          const offset = typeof offsetRaw === 'number' ? offsetRaw : 0;
          return { results: digests.slice(offset, offset + limit) };
        }
        return { results: [] };
      }),
      run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 0 } }),
    };
    return stmt;
  });
  const db = { prepare: prepareSpy } as unknown as D1Database;
  return { db, bindings };
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

async function historyRequest(
  offset: string | null,
  token: string | null,
): Promise<Request> {
  const headers = new Headers();
  if (token !== null) {
    headers.set('Cookie', `${SESSION_COOKIE_NAME}=${token}`);
  }
  const qs = offset === null ? '' : `?offset=${offset}`;
  return new Request(`${APP_URL}/api/history${qs}`, {
    method: 'GET',
    headers,
  });
}

describe('GET /api/history', () => {
  it('REQ-HIST-001: returns 401 when no session is present', async () => {
    const { db } = makeDb(null, []);
    const req = await historyRequest(null, null);
    const res = await GET(makeContext(req, env(db)) as never);
    expect(res.status).toBe(401);
  });

  it('REQ-HIST-001: offset=0 returns the first 30 rows and has_more=true when more exist', async () => {
    const token = await signSession(
      { sub: '12345', email: 'a@b.c', ghl: 'a', sv: 1 },
      JWT_SECRET,
    );
    // Seed 31 rows so the peek-row triggers has_more=true without
    // returning the 31st in the payload.
    const rows = Array.from({ length: 31 }, (_, i) =>
      fakeDigest(`d${i}`, 1_713_000_000 - i * 86_400, i % 5),
    );
    const { db } = makeDb(baseRow(), rows);
    const req = await historyRequest('0', token);
    const res = await GET(makeContext(req, env(db)) as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      digests: DigestRow[];
      has_more: boolean;
    };
    expect(body.digests.length).toBe(30);
    expect(body.has_more).toBe(true);
    expect(body.digests[0]!.id).toBe('d0');
    expect(body.digests[29]!.id).toBe('d29');
  });

  it('REQ-HIST-001: has_more=false when the last page returns fewer than 30 rows', async () => {
    const token = await signSession(
      { sub: '12345', email: 'a@b.c', ghl: 'a', sv: 1 },
      JWT_SECRET,
    );
    const rows = Array.from({ length: 5 }, (_, i) =>
      fakeDigest(`d${i}`, 1_713_000_000 - i * 86_400, 3),
    );
    const { db } = makeDb(baseRow(), rows);
    const req = await historyRequest('0', token);
    const res = await GET(makeContext(req, env(db)) as never);
    const body = (await res.json()) as { digests: DigestRow[]; has_more: boolean };
    expect(body.digests.length).toBe(5);
    expect(body.has_more).toBe(false);
  });

  it('REQ-HIST-001: offset=30 paginates to the second page', async () => {
    const token = await signSession(
      { sub: '12345', email: 'a@b.c', ghl: 'a', sv: 1 },
      JWT_SECRET,
    );
    // 60 rows total: page 2 (offset=30) yields rows 30..59 with has_more=false.
    const rows = Array.from({ length: 60 }, (_, i) =>
      fakeDigest(`d${i}`, 1_713_000_000 - i * 86_400, i),
    );
    const { db } = makeDb(baseRow(), rows);
    const req = await historyRequest('30', token);
    const res = await GET(makeContext(req, env(db)) as never);
    const body = (await res.json()) as { digests: DigestRow[]; has_more: boolean };
    expect(body.digests.length).toBe(30);
    expect(body.digests[0]!.id).toBe('d30');
    expect(body.digests[29]!.id).toBe('d59');
    expect(body.has_more).toBe(false);
  });

  it('REQ-HIST-001: non-numeric offset falls back to 0', async () => {
    const token = await signSession(
      { sub: '12345', email: 'a@b.c', ghl: 'a', sv: 1 },
      JWT_SECRET,
    );
    const rows = Array.from({ length: 3 }, (_, i) =>
      fakeDigest(`d${i}`, 1_713_000_000 - i * 86_400, 0),
    );
    const { db, bindings } = makeDb(baseRow(), rows);
    const req = await historyRequest('not-a-number', token);
    const res = await GET(makeContext(req, env(db)) as never);
    expect(res.status).toBe(200);
    // Second binding is the digests read — the third param (offset) is 0.
    const digestBind = bindings.find((b) => b.sql.startsWith('SELECT d.*'));
    expect(digestBind).toBeDefined();
    expect(digestBind!.params[2]).toBe(0);
  });

  it('REQ-HIST-001: negative offset falls back to 0', async () => {
    const token = await signSession(
      { sub: '12345', email: 'a@b.c', ghl: 'a', sv: 1 },
      JWT_SECRET,
    );
    const { db, bindings } = makeDb(baseRow(), []);
    const req = await historyRequest('-50', token);
    await GET(makeContext(req, env(db)) as never);
    const digestBind = bindings.find((b) => b.sql.startsWith('SELECT d.*'));
    expect(digestBind!.params[2]).toBe(0);
  });

  it('REQ-HIST-001: binds the session user_id as the first positional arg (IDOR-safe)', async () => {
    const token = await signSession(
      { sub: '12345', email: 'a@b.c', ghl: 'a', sv: 1 },
      JWT_SECRET,
    );
    const { db, bindings } = makeDb(baseRow(), []);
    const req = await historyRequest('0', token);
    await GET(makeContext(req, env(db)) as never);
    const digestBind = bindings.find((b) => b.sql.startsWith('SELECT d.*'));
    expect(digestBind).toBeDefined();
    expect(digestBind!.params[0]).toBe('12345');
  });

  it('REQ-HIST-001: SQL contains the article_count correlated subquery', async () => {
    const token = await signSession(
      { sub: '12345', email: 'a@b.c', ghl: 'a', sv: 1 },
      JWT_SECRET,
    );
    const { db, bindings } = makeDb(baseRow(), []);
    const req = await historyRequest('0', token);
    await GET(makeContext(req, env(db)) as never);
    const digestBind = bindings.find((b) => b.sql.startsWith('SELECT d.*'));
    expect(digestBind).toBeDefined();
    // Must be a correlated subquery on `articles`, aliased to article_count.
    expect(digestBind!.sql).toContain('SELECT COUNT(*) FROM articles');
    expect(digestBind!.sql).toContain('article_count');
    // Must use the user_id filter.
    expect(digestBind!.sql).toContain('d.user_id = ?1');
    // Must order by generated_at DESC per REQ-HIST-001 AC 1.
    expect(digestBind!.sql).toContain('ORDER BY generated_at DESC');
  });

  it('REQ-HIST-001: request LIMIT peeks one row past the page size', async () => {
    const token = await signSession(
      { sub: '12345', email: 'a@b.c', ghl: 'a', sv: 1 },
      JWT_SECRET,
    );
    const { db, bindings } = makeDb(baseRow(), []);
    const req = await historyRequest('0', token);
    await GET(makeContext(req, env(db)) as never);
    const digestBind = bindings.find((b) => b.sql.startsWith('SELECT d.*'));
    // LIMIT = PAGE_SIZE + 1 = 31
    expect(digestBind!.params[1]).toBe(31);
  });

  it('REQ-HIST-001: each row includes article_count in the response', async () => {
    const token = await signSession(
      { sub: '12345', email: 'a@b.c', ghl: 'a', sv: 1 },
      JWT_SECRET,
    );
    const rows = [
      fakeDigest('d0', 1_713_000_000, 7),
      fakeDigest('d1', 1_712_900_000, 12),
    ];
    const { db } = makeDb(baseRow(), rows);
    const req = await historyRequest('0', token);
    const res = await GET(makeContext(req, env(db)) as never);
    const body = (await res.json()) as { digests: DigestRow[] };
    expect(body.digests[0]!.article_count).toBe(7);
    expect(body.digests[1]!.article_count).toBe(12);
  });

  it('REQ-HIST-001: enriches each row with a human-readable model_name', async () => {
    const token = await signSession(
      { sub: '12345', email: 'a@b.c', ghl: 'a', sv: 1 },
      JWT_SECRET,
    );
    const rows = [fakeDigest('d0', 1_713_000_000, 5)];
    const { db } = makeDb(baseRow(), rows);
    const req = await historyRequest('0', token);
    const res = await GET(makeContext(req, env(db)) as never);
    const body = (await res.json()) as {
      digests: Array<DigestRow & { model_name: string }>;
    };
    // The test MODEL_ID maps to "Llama 3.1 8B Fast" in the catalog.
    expect(body.digests[0]!.model_name).toBe('Llama 3.1 8B Fast');
  });

  it('REQ-HIST-001: falls back to model_id when the catalog lookup misses', async () => {
    const token = await signSession(
      { sub: '12345', email: 'a@b.c', ghl: 'a', sv: 1 },
      JWT_SECRET,
    );
    const removed = fakeDigest('d0', 1_713_000_000, 5);
    removed.model_id = '@cf/removed/legacy';
    const { db } = makeDb(baseRow(), [removed]);
    const req = await historyRequest('0', token);
    const res = await GET(makeContext(req, env(db)) as never);
    const body = (await res.json()) as {
      digests: Array<DigestRow & { model_name: string }>;
    };
    expect(body.digests[0]!.model_name).toBe('@cf/removed/legacy');
  });
});

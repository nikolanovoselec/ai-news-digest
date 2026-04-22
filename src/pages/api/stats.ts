// Implements REQ-HIST-002
//
// GET /api/stats — four aggregated tiles for the settings widget:
//   { digests_generated, articles_read, articles_total,
//     tokens_consumed, cost_usd }
//
// Every tile query is user-scoped via the session user id. Article
// queries JOIN through digests on `d.user_id = :session_user_id` so the
// subquery cannot be coerced into returning another user's rows (IDOR
// defense by construction — REQ-HIST-002 AC 2).
//
// The queries run in parallel (Promise.all) — D1 handles multiple
// prepared statements concurrently over one HTTP connection, so this is
// faster than a single UNION-style query and easier to read.

import type { APIContext } from 'astro';
import { errorResponse } from '~/lib/errors';
import { loadSession } from '~/middleware/auth';

interface CountRow {
  n: number | null;
}

interface SumRow {
  n: number | null;
}

export async function GET(context: APIContext): Promise<Response> {
  const env = context.locals.runtime.env;
  if (typeof env.APP_URL !== 'string' || env.APP_URL === '') {
    return errorResponse('app_not_configured');
  }

  const session = await loadSession(context.request, env.DB, env.OAUTH_JWT_SECRET);
  if (session === null) {
    return errorResponse('unauthorized');
  }

  const userId = session.user.id;

  try {
    // Four parallel queries, one per tile. Every query is user-scoped
    // via `d.user_id = ?1` — article queries JOIN through digests so
    // the filter is always enforced on an authoritative parent row.
    const [digestsRow, articlesReadRow, articlesTotalRow, tokensRow, costRow] =
      await Promise.all([
        env.DB
          .prepare(
            `SELECT COUNT(*) AS n FROM digests WHERE user_id = ?1 AND status = 'ready'`,
          )
          .bind(userId)
          .first<CountRow>(),
        env.DB
          .prepare(
            `SELECT COUNT(*) AS n FROM articles a
             JOIN digests d ON d.id = a.digest_id
             WHERE d.user_id = ?1 AND a.read_at IS NOT NULL`,
          )
          .bind(userId)
          .first<CountRow>(),
        env.DB
          .prepare(
            `SELECT COUNT(*) AS n FROM articles a
             JOIN digests d ON d.id = a.digest_id
             WHERE d.user_id = ?1`,
          )
          .bind(userId)
          .first<CountRow>(),
        env.DB
          .prepare(
            `SELECT COALESCE(SUM(COALESCE(tokens_in, 0) + COALESCE(tokens_out, 0)), 0) AS n
             FROM digests WHERE user_id = ?1 AND status = 'ready'`,
          )
          .bind(userId)
          .first<SumRow>(),
        env.DB
          .prepare(
            `SELECT COALESCE(SUM(estimated_cost_usd), 0) AS n
             FROM digests WHERE user_id = ?1 AND status = 'ready'`,
          )
          .bind(userId)
          .first<SumRow>(),
      ]);

    const body = {
      digests_generated: digestsRow?.n ?? 0,
      articles_read: articlesReadRow?.n ?? 0,
      articles_total: articlesTotalRow?.n ?? 0,
      tokens_consumed: tokensRow?.n ?? 0,
      cost_usd: costRow?.n ?? 0,
    };

    const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8' });
    if (session.refreshCookie !== null) {
      headers.append('Set-Cookie', session.refreshCookie);
    }
    return new Response(JSON.stringify(body), { status: 200, headers });
  } catch {
    return errorResponse('internal_error');
  }
}

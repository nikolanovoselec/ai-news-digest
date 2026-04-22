// Implements REQ-HIST-001
//
// GET /api/history?offset=<int> — paginated list of the authenticated
// user's past digests, newest first, 30 per page.
//
// The SQL is the exact form mandated by REQ-HIST-001 AC 5:
//   SELECT d.*, (SELECT COUNT(*) FROM articles WHERE digest_id = d.id)
//     AS article_count
//   FROM digests d
//   WHERE d.user_id = :session_user_id
//   ORDER BY generated_at DESC
//   LIMIT 30 OFFSET :offset
//
// The `user_id` filter is the sole IDOR protection — there is no
// ownership check further up the stack. A correlated subquery computes
// `article_count` per row without a separate round trip.
//
// `has_more` is derived by peeking one row past the page size: we
// request LIMIT 31, slice off the last, and report true when that 31st
// row existed. Avoids a second COUNT(*) query.

import type { APIContext } from 'astro';
import { errorResponse } from '~/lib/errors';
import { log } from '~/lib/log';
import { modelById } from '~/lib/models';
import { loadSession } from '~/middleware/auth';

/** Page size fixed by REQ-HIST-001 AC 1. */
const PAGE_SIZE = 30;

/** Row shape returned by the SELECT below. Keep in sync with the
 *  `digests` table schema (migrations/0001_initial.sql) plus the
 *  `article_count` correlated-subquery column. */
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

/**
 * Parse and clamp the `offset` query param. Values that are missing,
 * non-integer, or negative collapse to 0 — callers see the first page
 * rather than an error, which is the most forgiving UX for a back
 * button that encoded a stale query string.
 */
function parseOffset(url: URL): number {
  const raw = url.searchParams.get('offset');
  if (raw === null) return 0;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
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

  const url = new URL(context.request.url);
  const offset = parseOffset(url);

  // Request one extra row so we can detect whether another page exists
  // without a second COUNT(*) query.
  const fetchLimit = PAGE_SIZE + 1;

  let rows: DigestRow[];
  try {
    const result = await env.DB.prepare(
      'SELECT d.*, (SELECT COUNT(*) FROM articles WHERE digest_id = d.id) AS article_count ' +
        'FROM digests d WHERE d.user_id = ?1 ORDER BY generated_at DESC LIMIT ?2 OFFSET ?3',
    )
      .bind(session.user.id, fetchLimit, offset)
      .all<DigestRow>();
    rows = result.results ?? [];
  } catch (err) {
    log('error', 'digest.generation', {
      user_id: session.user.id,
      op: 'history_read',
      error_code: 'internal_error',
      detail: String(err).slice(0, 500),
    });
    return errorResponse('internal_error');
  }

  const hasMore = rows.length > PAGE_SIZE;
  const pageRows = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

  // Attach human-readable model names so the client-side "Load more"
  // renderer can display them without bundling the model catalog.
  // Unknown IDs (e.g. models removed from the catalog mid-retention)
  // fall back to the raw id so the UI degrades gracefully.
  const enriched = pageRows.map((row) => {
    const meta = modelById(row.model_id);
    return {
      ...row,
      model_name: meta !== undefined ? meta.name : row.model_id,
    };
  });

  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8' });
  if (session.refreshCookie !== null) {
    headers.append('Set-Cookie', session.refreshCookie);
  }

  return new Response(
    JSON.stringify({ digests: enriched, has_more: hasMore }),
    { status: 200, headers },
  );
}

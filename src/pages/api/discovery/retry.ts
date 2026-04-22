// Implements REQ-DISC-004
//
// POST /api/discovery/retry — force a fresh LLM-assisted discovery for
// a tag whose existing `sources:{tag}` entry is empty (or to retry a
// stubborn tag). Body shape: `{ "tag": "<tag>" }`.
//
// Steps:
//   1. Origin check (REQ-AUTH-003 — CSRF defense for state-changing POSTs).
//   2. Session check — anonymous users cannot queue discovery.
//   3. Validate the tag is in the user's `hashtags_json`; otherwise
//      return HTTP 400 with code `unknown_tag` (prevents blast-radius
//      abuse — you can only retry tags you've already saved).
//   4. DELETE the `sources:{tag}` and `discovery_failures:{tag}` KV
//      entries so the next cron starts fresh.
//   5. INSERT OR IGNORE a `pending_discoveries` row for this
//      `(user_id, tag)` so the next 5-minute cron picks it up.
//
// The endpoint does not perform the discovery itself — the cron is the
// only path that calls Workers AI. Returning `{ ok: true }` only
// promises the tag has been re-queued.

import type { APIContext } from 'astro';
import { errorResponse } from '~/lib/errors';
import { log } from '~/lib/log';
import { loadSession } from '~/middleware/auth';
import { checkOrigin, originOf } from '~/middleware/origin-check';

interface RetryBody {
  tag?: unknown;
}

/**
 * Parse the user's stored hashtags_json (a JSON array of strings,
 * possibly prefixed with `#`). Returns an empty set for null/invalid
 * JSON so callers always get a stable lookup.
 *
 * Tags are compared case-sensitively and with the leading `#`
 * stripped, so `"#ai"` in storage matches a body value of `"ai"` or
 * `"#ai"`.
 */
function userHashtagSet(hashtagsJson: string | null): Set<string> {
  const out = new Set<string>();
  if (hashtagsJson === null || hashtagsJson === '') return out;
  try {
    const parsed = JSON.parse(hashtagsJson);
    if (!Array.isArray(parsed)) return out;
    for (const entry of parsed) {
      if (typeof entry !== 'string') continue;
      const normalized = entry.startsWith('#') ? entry.slice(1) : entry;
      if (normalized !== '') out.add(normalized);
    }
  } catch {
    return out;
  }
  return out;
}

export async function POST(context: APIContext): Promise<Response> {
  const env = context.locals.runtime.env;
  if (typeof env.APP_URL !== 'string' || env.APP_URL === '') {
    return errorResponse('app_not_configured');
  }
  const appOrigin = originOf(env.APP_URL);

  // Origin check first — the session cookie cannot be presented by a
  // cross-site attacker because SameSite=Lax, but the Origin header is
  // a hardened defense-in-depth layer (REQ-AUTH-003).
  const originResult = checkOrigin(context.request, appOrigin);
  if (!originResult.ok) {
    return originResult.response!;
  }

  const session = await loadSession(context.request, env.DB, env.OAUTH_JWT_SECRET);
  if (session === null) {
    return errorResponse('unauthorized');
  }

  let body: RetryBody;
  try {
    body = (await context.request.json()) as RetryBody;
  } catch {
    return errorResponse('bad_request');
  }

  const rawTag = typeof body.tag === 'string' ? body.tag.trim() : '';
  if (rawTag === '') {
    return errorResponse('bad_request');
  }
  const tag = rawTag.startsWith('#') ? rawTag.slice(1) : rawTag;

  // Only retry tags the user has actually saved — otherwise anyone
  // with a session could queue arbitrary LLM calls for arbitrary
  // strings (cost blast radius).
  const userTags = userHashtagSet(session.user.hashtags_json);
  if (!userTags.has(tag)) {
    return errorResponse('unknown_tag');
  }

  const userId = session.user.id;
  const nowSec = Math.floor(Date.now() / 1000);

  try {
    await env.KV.delete(`sources:${tag}`);
    await env.KV.delete(`discovery_failures:${tag}`);
    await env.DB.prepare(
      'INSERT OR IGNORE INTO pending_discoveries (user_id, tag, added_at) VALUES (?1, ?2, ?3)',
    )
      .bind(userId, tag, nowSec)
      .run();
  } catch (err) {
    log('error', 'discovery.completed', {
      tag,
      user_id: userId,
      status: 'retry_queue_failed',
      detail: String(err).slice(0, 500),
    });
    return errorResponse('internal_error');
  }

  log('info', 'discovery.completed', {
    tag,
    user_id: userId,
    status: 'retry_queued',
  });

  // If the middleware silent-refresh issued a near-expiry re-issue of
  // the session cookie, pass it through so the client stays logged in.
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8' });
  if (session.refreshCookie !== null) {
    headers.append('Set-Cookie', session.refreshCookie);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers,
  });
}

// Implements REQ-SET-002 AC 8 (delete initials) + REQ-AUTH-003 (Origin check).
//
// POST /api/tags/delete-initial — strip every DEFAULT_HASHTAGS entry
// from the authenticated user's hashtag list, leaving custom tags
// the user added themselves intact. 303-redirect to /digest.
//
// Paired with POST /api/tags/restore. Same transport contract
// (native form submit + 303) so both buttons work with JS disabled
// or a stale SW bundle. No request body is read.

import type { APIContext } from 'astro';
import { errorResponse } from '~/lib/errors';
import { log } from '~/lib/log';
import { loadSession } from '~/middleware/auth';
import { checkOrigin, originOf } from '~/middleware/origin-check';
import { DEFAULT_HASHTAGS } from '~/lib/default-hashtags';

export async function POST(context: APIContext): Promise<Response> {
  const env = context.locals.runtime.env;
  if (typeof env.APP_URL !== 'string' || env.APP_URL === '') {
    return errorResponse('app_not_configured');
  }
  const appOrigin = originOf(env.APP_URL);

  const originResult = checkOrigin(context.request, appOrigin);
  if (!originResult.ok) {
    return originResult.response!;
  }

  const session = await loadSession(context.request, env.DB, env.OAUTH_JWT_SECRET);
  if (session === null) {
    return new Response(null, {
      status: 303,
      headers: { Location: '/api/auth/github/login' },
    });
  }

  // Parse the user's current hashtag list. Anything the coordinator
  // can't parse as a string array is treated as empty so a corrupt
  // row doesn't hard-fail the form submit.
  let current: string[] = [];
  const raw = session.user.hashtags_json;
  if (typeof raw === 'string' && raw !== '') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        current = parsed.filter((v): v is string => typeof v === 'string');
      }
    } catch {
      current = [];
    }
  }

  const defaultSet = new Set<string>(DEFAULT_HASHTAGS);
  const next = current.filter((t) => !defaultSet.has(t));

  try {
    await env.DB
      .prepare('UPDATE users SET hashtags_json = ?1 WHERE id = ?2')
      .bind(JSON.stringify(next), session.user.id)
      .run();
  } catch (err) {
    log('error', 'settings.update.failed', {
      user_id: session.user.id,
      op: 'tags-delete-initial',
      error_code: 'internal_error',
      detail: String(err).slice(0, 500),
    });
    return errorResponse('internal_error');
  }

  const headers = new Headers({ Location: '/digest' });
  if (session.refreshCookie !== null) {
    headers.append('Set-Cookie', session.refreshCookie);
  }
  return new Response(null, { status: 303, headers });
}

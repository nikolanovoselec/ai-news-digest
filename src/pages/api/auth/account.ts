// Implements REQ-AUTH-005
//
// DELETE /api/auth/account — permanently delete the authenticated
// user's account and all cascaded data.
//
// Request body: `{ "confirm": "DELETE" }` — explicit string confirmation
// required; anything else is rejected. The Origin check (REQ-AUTH-003)
// is applied first to block cross-site CSRF. Foreign-key ON DELETE
// CASCADE (see migrations/0001_initial.sql) removes every related
// `digests`, `articles`, and `pending_discoveries` row atomically with
// the users row removal.
//
// KV entries keyed by the user's id are enumerated and deleted after
// the row delete so a failure there does not block account removal
// itself (AC 4 — best-effort on KV, required on D1).

import type { APIContext } from 'astro';
import { applyForeignKeysPragma } from '~/lib/db';
import { errorResponse } from '~/lib/errors';
import { log } from '~/lib/log';
import { loadSession, buildClearSessionCookie } from '~/middleware/auth';
import { checkOrigin, originOf } from '~/middleware/origin-check';

interface DeleteAccountBody {
  confirm?: unknown;
}

/**
 * Delete every KV key that belongs to {@link userId}. We namespace
 * by the user id (`user:<id>:...`) so the list prefix is enough. The
 * KV list API returns up to 1000 keys per page; we paginate via cursor
 * until the set is empty.
 */
async function deleteUserKvEntries(kv: KVNamespace, userId: string): Promise<void> {
  const prefix = `user:${userId}:`;
  let cursor: string | undefined;
  do {
    const page = await kv.list({ prefix, ...(cursor !== undefined ? { cursor } : {}) });
    await Promise.all(page.keys.map((k) => kv.delete(k.name)));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor !== undefined);
}

export async function DELETE(context: APIContext): Promise<Response> {
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
    return errorResponse('unauthorized');
  }

  // Explicit confirmation required — AC 1.
  let body: DeleteAccountBody;
  try {
    body = (await context.request.json()) as DeleteAccountBody;
  } catch {
    return errorResponse('bad_request');
  }
  if (body.confirm !== 'DELETE') {
    return errorResponse('confirmation_required');
  }

  const userId = session.user.id;

  try {
    // D1 requires the FK pragma per connection for ON DELETE CASCADE
    // to fire. Without it the users row goes but the child rows stay.
    await applyForeignKeysPragma(env.DB);
    const result = await env.DB.prepare('DELETE FROM users WHERE id = ?1').bind(userId).run();
    if (result.meta === undefined || result.meta.changes === 0) {
      // Race with a concurrent logout or already-deleted account —
      // still clear the cookie and return success from the user's POV.
      log('warn', 'auth.account.delete', {
        user_id: userId,
        detail: 'no row affected',
      });
    }
  } catch (err) {
    log('error', 'auth.account.delete.failed', {
      user_id: userId,
      error_code: 'internal_error',
      detail: String(err).slice(0, 500),
    });
    return errorResponse('internal_error');
  }

  // Best-effort KV cleanup (AC 4). Failure here is logged but does
  // not roll back the D1 delete — once the user row is gone the
  // account is effectively deleted from the user's perspective.
  try {
    await deleteUserKvEntries(env.KV, userId);
  } catch (err) {
    log('error', 'auth.account.delete.failed', {
      user_id: userId,
      error_code: 'kv_cleanup_failed',
      detail: String(err).slice(0, 500),
    });
  }

  log('info', 'auth.account.delete', { user_id: userId });

  const headers = new Headers({ 'Content-Type': 'application/json' });
  headers.append('Set-Cookie', buildClearSessionCookie());
  return new Response(
    JSON.stringify({
      ok: true,
      redirect: `/?account_deleted=1`,
    }),
    { status: 200, headers },
  );
}

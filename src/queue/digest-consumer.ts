// Implements REQ-GEN-001, REQ-GEN-002
//
// Queue consumer for the `digest-jobs` Cloudflare Queue. One handler
// function drains every message in a batch, loads the target user from
// D1, and hands off to the single `generateDigest` pipeline in
// `~/lib/generate`.
//
// Concurrency and retry are provided by the Queue runtime:
//   - Up to 10 messages run concurrently (one isolate per message) —
//     this is the natural backpressure layer for the 08:00 thundering
//     herd (REQ-GEN-001 AC 5).
//   - Throwing from this handler marks the message for retry, up to
//     `max_retries` attempts as set in `wrangler.toml`.
//   - Returning normally acks the message.
//
// Design rules:
//   - We ack (return) when `generateDigest` resolves, EVEN on a 'failed'
//     result. The `status='failed'` row plus the sanitized `error_code`
//     is the user-visible signal; Queue retry would just rerun an LLM
//     call that already failed deterministically.
//   - We throw (trigger retry) only on unrecoverable preconditions:
//     malformed payload, user row missing, or `generateDigest` itself
//     throwing (it should not — it has its own try/catch — but if it
//     did escape, the queue retry gives us one more attempt).
//   - The consumer is stateless: every message is handled in an isolate,
//     all state goes through D1 and KV. No module-level mutable state.

import { generateDigest as defaultGenerateDigest } from '~/lib/generate';
import type { GenerateDigestResult } from '~/lib/generate';
import { log } from '~/lib/log';
import type { AuthenticatedUser } from '~/lib/types';

/** Signature of the digest-generation pipeline. Abstracted so tests can
 * inject a stub without touching the module system — the default
 * implementation is {@link defaultGenerateDigest} from `~/lib/generate`. */
export type GenerateDigestFn = (
  env: Env,
  user: AuthenticatedUser,
  trigger: 'scheduled' | 'manual',
  digestId?: string,
) => Promise<GenerateDigestResult>;

/** Shape of every `digest-jobs` queue message. Produced by the cron
 * dispatcher (scheduled) and the manual refresh API (manual). This is a
 * re-export of the global `DigestJobMessage` type from `env.d.ts` so
 * callers can import it from the consumer module directly. */
export type DigestJob = DigestJobMessage;

/** D1 users-row projection we need for `generateDigest`. Narrower than
 * {@link AuthenticatedUser} because we don't care about `session_version`
 * here, but the pipeline reads the full shape so we fetch the same columns
 * as the auth middleware does. */
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

/**
 * Validate an untyped queue payload into a {@link DigestJob}.
 * Returns `null` when any required field is missing or of the wrong type.
 * Queue payloads are effectively trusted (we produce them ourselves) but
 * a malformed message from a rogue producer must never crash the consumer.
 */
function parseJob(body: unknown): DigestJob | null {
  if (body === null || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (b.trigger !== 'scheduled' && b.trigger !== 'manual') return null;
  if (typeof b.user_id !== 'string' || b.user_id === '') return null;
  if (typeof b.local_date !== 'string' || b.local_date === '') return null;
  const job: DigestJob = {
    trigger: b.trigger,
    user_id: b.user_id,
    local_date: b.local_date,
  };
  if (typeof b.digest_id === 'string' && b.digest_id !== '') {
    job.digest_id = b.digest_id;
  }
  return job;
}

/**
 * Load the user row needed by `generateDigest`. Returns `null` when the
 * user no longer exists (e.g. account deleted between enqueue and
 * consume).
 */
async function loadUser(db: D1Database, userId: string): Promise<AuthenticatedUser | null> {
  const row = await db
    .prepare(
      'SELECT id, email, gh_login, tz, digest_hour, digest_minute, hashtags_json, model_id, email_enabled, session_version FROM users WHERE id = ?1',
    )
    .bind(userId)
    .first<UserRow>();
  if (row === null) return null;
  return {
    id: row.id,
    email: row.email,
    gh_login: row.gh_login,
    tz: row.tz,
    digest_hour: row.digest_hour,
    digest_minute: row.digest_minute,
    hashtags_json: row.hashtags_json,
    model_id: row.model_id,
    email_enabled: row.email_enabled,
    session_version: row.session_version,
  };
}

/**
 * Process one queue message.
 *
 * Returns normally on success OR on a persisted `status='failed'` digest
 * (both are terminal states from the Queue's POV — no retry is useful).
 * Throws only when the message cannot be handled at all (malformed body
 * OR generateDigest itself escapes its own try/catch). A thrown error
 * triggers Queue retry per the `max_retries` setting in wrangler.toml.
 *
 * `generate` is injectable so tests can stub the pipeline. Production
 * callers pass the default `generateDigest` from `~/lib/generate`.
 */
export async function processDigestJob(
  env: Env,
  rawBody: unknown,
  generate: GenerateDigestFn = defaultGenerateDigest,
): Promise<void> {
  const job = parseJob(rawBody);
  if (job === null) {
    log('error', 'digest.generation', {
      status: 'malformed_payload',
      detail: JSON.stringify(rawBody).slice(0, 500),
    });
    // Malformed payload is unrecoverable — do not retry (Queue would
    // just replay the same bad message). Swallow so the message acks.
    return;
  }

  const user = await loadUser(env.DB, job.user_id);
  if (user === null) {
    log('warn', 'digest.generation', {
      user_id: job.user_id,
      trigger: job.trigger,
      status: 'user_not_found',
    });
    // User deleted between enqueue and consume — nothing to do.
    return;
  }

  // `generateDigest` has its own internal try/catch and returns a
  // terminal GenerateDigestResult. We forward the call and translate
  // any escaped exception into a throw so Queue retry can kick in.
  const result = await generate(env, user, job.trigger, job.digest_id);

  log('info', 'digest.generation', {
    user_id: user.id,
    digest_id: result.digestId,
    trigger: job.trigger,
    status: result.status,
    ...(result.error_code !== undefined ? { error_code: result.error_code } : {}),
  });
}

/**
 * Queue handler entry point. Invoked by the Worker's `queue()` export
 * in `src/worker.ts` with a batch of messages.
 *
 * Per-message failures throw so the Queue retries that specific
 * message; successful messages (including those that wrote a terminal
 * `status='failed'` digest row) return normally and get acked.
 */
export async function handleQueueBatch(
  batch: MessageBatch<DigestJob>,
  env: Env,
  generate: GenerateDigestFn = defaultGenerateDigest,
): Promise<void> {
  for (const message of batch.messages) {
    try {
      await processDigestJob(env, message.body, generate);
      message.ack();
    } catch (err) {
      // generateDigest should never throw (it owns a try/catch) but if
      // something deeper escapes, trigger Queue retry for this message.
      log('error', 'digest.generation', {
        status: 'consumer_throw',
        detail: String(err).slice(0, 500),
      });
      message.retry();
    }
  }
}

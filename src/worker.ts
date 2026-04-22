// Implements REQ-GEN-001, REQ-GEN-007
//
// Module Worker entry point — exports `scheduled` (cron), `queue`
// (digest-jobs consumer), and `fetch` (delegates to the Astro-generated
// handler in production, minimal fallback in tests).
//
// Split of responsibilities:
//   - `scheduled(controller, env, ctx)` — the 5-minute cron trigger runs
//      three passes in order:
//         1. Stuck-digest sweeper (REQ-GEN-007): mark any in_progress
//            digest older than 10 minutes as failed. Runs first,
//            unconditionally, before any scheduling work.
//         2. Discovery processor: drain up to 3 pending_discoveries rows
//            via `processPendingDiscoveries` from `~/lib/discovery`.
//         3. Scheduling pass (REQ-GEN-001): for each distinct tz, compute
//            the current local time and enqueue due users to
//            `env.DIGEST_JOBS` via `sendBatch`. Dispatch only — no digest
//            generation inline.
//   - `queue(batch, env, ctx)` — drain `digest-jobs` messages. Each message
//     loads the user and invokes `generateDigest`; see
//     `src/queue/digest-consumer.ts` for the full contract.
//   - `fetch(request, env, ctx)` — in production, the Astro Cloudflare
//     adapter's built worker handles every request. The test pool runs
//     this file directly (see `wrangler.test.toml`) and tests never call
//     `fetch` — API routes are imported and called directly. The
//     fallback below keeps the type contract satisfied for both paths.
//
// The Astro Cloudflare adapter generates its own `_worker.js` at build
// time with a `fetch` handler. The production `wrangler.toml` points
// `main` at that generated file. This file's `fetch` export is therefore
// only reached in the test runner, which does not exercise HTML pages.

import { processPendingDiscoveries } from '~/lib/discovery';
import { localDateInTz, localHourMinuteInTz } from '~/lib/tz';
import { log } from '~/lib/log';
import { handleQueueBatch } from '~/queue/digest-consumer';
import type { DigestJob } from '~/queue/digest-consumer';

/** Five-minute cron window, expressed in seconds so we can reason about
 * the stuck-digest threshold uniformly. */
const CRON_WINDOW_MINUTES = 5;
/** A digest in-progress longer than this is considered stuck and swept
 * to status='failed' with error_code='generation_stalled' (REQ-GEN-007). */
const STUCK_DIGEST_THRESHOLD_SECONDS = 600;
/** Upper bound on the pending-discoveries batch drained per cron run. */
const DISCOVERY_BATCH_LIMIT = 3;

/** Shape of a users-row projection used by the scheduling pass. We do
 * not need the full user row here — just the id to enqueue. */
interface DueUserRow {
  id: string;
}

/**
 * Sweep stuck in-progress digests. Runs every cron invocation before any
 * scheduling work. If this fails we log and skip the rest of the cron
 * (REQ-GEN-007 AC 3) so a transient D1 hiccup does not cascade into
 * enqueueing jobs against a half-swept state.
 */
async function sweepStuckDigests(env: Env, nowSec: number): Promise<void> {
  const threshold = nowSec - STUCK_DIGEST_THRESHOLD_SECONDS;
  await env.DB
    .prepare(
      `UPDATE digests
       SET status = 'failed', error_code = 'generation_stalled'
       WHERE status = 'in_progress' AND generated_at < ?1`,
    )
    .bind(threshold)
    .run();
}

/**
 * Scheduling pass. For every distinct tz in the users table, compute the
 * current local time, pick users whose {digest_hour, digest_minute} falls
 * in the current 5-minute half-open window, and whose
 * `last_generated_local_date` is not today's local date.
 *
 * Enqueues one `{ trigger: 'scheduled', user_id, local_date }` message per
 * due user via `sendBatch` for efficiency (REQ-GEN-001 AC 3).
 */
async function dispatchScheduledDigests(env: Env, nowSec: number): Promise<void> {
  // Collect the distinct set of tzs currently configured on users. An
  // empty result means no users — early return keeps cron fast
  // (REQ-GEN-001 AC 4: <1s for the scheduling pass).
  // A user with no tags has nothing to summarise. Skip them entirely
  // rather than wasting a generate pass that would fail with
  // `all_sources_failed`. `hashtags_json IS NOT NULL` alone is
  // insufficient because `POST /api/tags` writes `'[]'` briefly during
  // edit flows — guard on both NULL and the literal empty-array JSON.
  const tzRows = await env.DB
    .prepare(
      "SELECT DISTINCT tz FROM users WHERE hashtags_json IS NOT NULL AND hashtags_json != '[]'",
    )
    .all<{ tz: string }>();
  const tzs = (tzRows.results ?? [])
    .map((r) => r.tz)
    .filter((t): t is string => typeof t === 'string' && t !== '');

  const jobs: Array<{ body: DigestJob }> = [];

  for (const tz of tzs) {
    let windowStartMinute: number;
    let hour: number;
    let localDate: string;
    try {
      const hm = localHourMinuteInTz(nowSec, tz);
      hour = hm.hour;
      // Half-open 5-minute window — cron fires every 5 min on minutes
      // divisible by 5, so we match users scheduled to any minute inside
      // this window (e.g. cron at 08:05 covers minutes 5..9 inclusive).
      windowStartMinute =
        Math.floor(hm.minute / CRON_WINDOW_MINUTES) * CRON_WINDOW_MINUTES;
      localDate = localDateInTz(nowSec, tz);
    } catch (err) {
      log('warn', 'digest.generation', {
        tz,
        status: 'tz_conversion_failed',
        detail: String(err).slice(0, 200),
      });
      continue;
    }

    // SELECT due users for this tz. The query is conservative: it skips
    // users already processed today (last_generated_local_date = today)
    // so restarts / overlapping runs are idempotent (REQ-GEN-001 AC 2).
    const rows = await env.DB
      .prepare(
        `SELECT id FROM users
         WHERE hashtags_json IS NOT NULL
           AND hashtags_json != '[]'
           AND tz = ?1
           AND digest_hour = ?2
           AND digest_minute >= ?3
           AND digest_minute < ?4
           AND (last_generated_local_date IS NULL
                OR last_generated_local_date != ?5)`,
      )
      .bind(
        tz,
        hour,
        windowStartMinute,
        windowStartMinute + CRON_WINDOW_MINUTES,
        localDate,
      )
      .all<DueUserRow>();

    for (const row of rows.results ?? []) {
      if (typeof row.id !== 'string' || row.id === '') continue;
      jobs.push({
        body: {
          trigger: 'scheduled',
          user_id: row.id,
          local_date: localDate,
        },
      });
    }
  }

  if (jobs.length === 0) return;

  // One sendBatch is cheaper than N sends. Queues accepts up to 100
  // messages per batch — we chunk to stay under that cap. In practice
  // even 1000 daily users distributed across time zones will never
  // produce more than a handful of messages per 5-minute window.
  const BATCH_CAP = 100;
  for (let i = 0; i < jobs.length; i += BATCH_CAP) {
    const chunk = jobs.slice(i, i + BATCH_CAP);
    await env.DIGEST_JOBS.sendBatch(chunk);
  }

  log('info', 'digest.generation', {
    status: 'dispatched',
    enqueued: jobs.length,
  });
}

/**
 * Cron handler. Runs every 5 minutes per `[triggers]` in wrangler.toml.
 *
 * The three passes run sequentially; sweeper failure skips the rest
 * (REQ-GEN-007 AC 3). Discovery and dispatch failures log and continue
 * so one bad tz or a transient Workers AI hiccup does not block the
 * maintenance sweep.
 */
export async function scheduled(
  _controller: ScheduledController,
  env: Env,
  _ctx: ExecutionContext,
): Promise<void> {
  const nowSec = Math.floor(Date.now() / 1000);

  // 1. Stuck-digest sweeper (REQ-GEN-007). Runs unconditionally and any
  // other work is skipped if the sweep fails (AC 3).
  try {
    await sweepStuckDigests(env, nowSec);
  } catch (err) {
    log('error', 'digest.generation', {
      status: 'stuck_sweep_failed',
      detail: String(err).slice(0, 500),
    });
    return;
  }

  // 2. Discovery processor — drain up to N pending tags per cron.
  // Failures here do not block the scheduling pass (REQ-DISC-003).
  try {
    await processPendingDiscoveries(env, DISCOVERY_BATCH_LIMIT);
  } catch (err) {
    log('error', 'discovery.completed', {
      status: 'discovery_processor_failed',
      detail: String(err).slice(0, 500),
    });
  }

  // 3. Scheduling pass — enqueue due users. Failures log and continue
  // so one bad tz does not abort the whole cron invocation; per-tz
  // errors are also caught inside the function.
  try {
    await dispatchScheduledDigests(env, nowSec);
  } catch (err) {
    log('error', 'digest.generation', {
      status: 'dispatch_failed',
      detail: String(err).slice(0, 500),
    });
  }
}

/**
 * Queue consumer. Thin delegate — every message is parsed, the user is
 * loaded, and generateDigest is called. See
 * `src/queue/digest-consumer.ts` for the full retry contract.
 */
export async function queue(
  batch: MessageBatch<DigestJob>,
  env: Env,
  _ctx: ExecutionContext,
): Promise<void> {
  await handleQueueBatch(batch, env);
}

/**
 * HTTP handler. In production the Astro Cloudflare adapter's generated
 * worker is the real entry point (`main` in wrangler.toml). This
 * export exists so the Module-Worker type contract is satisfied and so
 * the test pool (which points `main` at this file) has a handler for
 * any accidental request — tests always call API routes directly.
 */
export default {
  scheduled,
  queue,
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    // Delegate to the static ASSETS fetcher when present (production
    // runs the Astro-built entry instead; this branch is for parity).
    if (env.ASSETS !== undefined) {
      return env.ASSETS.fetch(request);
    }
    return new Response('news-digest', { status: 200 });
  },
};

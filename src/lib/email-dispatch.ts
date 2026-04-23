// Implements REQ-MAIL-001
//
// Daily digest-ready email dispatcher. Runs on the `*/5 * * * *` cron.
//
// Contract:
//   - For every user with `email_enabled = 1`, `digest_hour:digest_minute`
//     falling inside the current 5-minute local wall-clock window, and
//     `last_emailed_local_date` not equal to today's local date in the
//     user's tz: render the simplified "digest is ready" email, send it
//     via Resend, and stamp `last_emailed_local_date` so the next cron
//     tick in the same local day is a no-op for that user.
//   - Email delivery is best-effort. A Resend outage never blocks a
//     sibling user's send and never escalates out of this function —
//     the top-level cron handler already wraps us in try/catch.
//   - When a send fails (Resend non-2xx or fetch error), we deliberately
//     do NOT stamp `last_emailed_local_date`: the next cron tick will
//     retry, so a transient Resend blip recovers automatically within
//     the same local day.
//
// Scheduling model:
//   The cron fires every 5 minutes. We match users whose `digest_minute`
//   is in the 5-minute window containing the current local minute,
//   expressed as `[floor(localMinute/5)*5, floor(localMinute/5)*5 + 5)`.
//   This keeps the match idempotent across multiple runs within the
//   same bucket (the `last_emailed_local_date` gate absorbs any
//   double-fire from cron jitter).

import { localDateInTz, localHourMinuteInTz } from '~/lib/tz';
import { log } from '~/lib/log';
import { renderDigestReadyEmail, sendEmail } from '~/lib/email';

/** User row subset needed for dispatch. All columns are non-null in
 *  practice for email-enabled users, but `last_emailed_local_date`
 *  is nullable before the first successful send. */
interface DispatchUserRow {
  id: string;
  email: string;
  gh_login: string;
  digest_hour: number;
  digest_minute: number;
  last_emailed_local_date: string | null;
}

/** Row returned by the distinct-tz probe. */
interface TzRow {
  tz: string;
}

/**
 * Iterate email-enabled users whose local clock matches the current
 * 5-minute window, send each their digest-ready email, and stamp
 * `last_emailed_local_date` on success.
 *
 * Returns normally on any per-user failure; logs and continues so one
 * bad recipient never blocks the remaining queue.
 */
export async function dispatchDailyEmails(env: Env): Promise<void> {
  const now = Math.floor(Date.now() / 1000);

  // Distinct tz probe: we loop once per tz so each user's local clock
  // is computed from the same Intl.DateTimeFormat call, and the
  // per-tz query binds integer hour/minute bounds SQLite can index
  // against. Users without email_enabled=1 are filtered here so the
  // downstream per-tz query is the only one that needs the predicate.
  let tzRows: TzRow[];
  try {
    const res = await env.DB.prepare(
      `SELECT DISTINCT tz FROM users WHERE email_enabled = 1`,
    ).all<TzRow>();
    tzRows = res.results ?? [];
  } catch (err) {
    log('error', 'email.send.failed', {
      to: null,
      status: null,
      error: `tz_probe_failed: ${String(err).slice(0, 200)}`,
    });
    return;
  }

  for (const { tz } of tzRows) {
    const { hour, minute } = localHourMinuteInTz(now, tz);
    const bucketStart = minute - (minute % 5);
    const bucketEnd = bucketStart + 5;
    const localDate = localDateInTz(now, tz);

    let users: DispatchUserRow[];
    try {
      const res = await env.DB.prepare(
        `SELECT id, email, gh_login, digest_hour, digest_minute, last_emailed_local_date
           FROM users
          WHERE email_enabled = 1
            AND tz = ?1
            AND digest_hour = ?2
            AND digest_minute >= ?3
            AND digest_minute < ?4
            AND (last_emailed_local_date IS NULL OR last_emailed_local_date != ?5)`,
      )
        .bind(tz, hour, bucketStart, bucketEnd, localDate)
        .all<DispatchUserRow>();
      users = res.results ?? [];
    } catch (err) {
      log('error', 'email.send.failed', {
        to: null,
        status: null,
        error: `user_scan_failed: ${String(err).slice(0, 200)}`,
      });
      continue;
    }

    for (const user of users) {
      try {
        const { subject, text, html } = renderDigestReadyEmail({
          appUrl: env.APP_URL,
          userDisplayName: user.gh_login !== '' ? user.gh_login : user.email,
        });

        const result = await sendEmail(env, {
          to: user.email,
          subject,
          text,
          html,
        });

        if (!result.sent) {
          // Already logged inside sendEmail. Skip the date stamp so
          // the next cron tick retries within the same local day.
          continue;
        }

        await env.DB.prepare(
          `UPDATE users SET last_emailed_local_date = ?1 WHERE id = ?2`,
        )
          .bind(localDate, user.id)
          .run();
      } catch (err) {
        // Defensive: sendEmail is documented as non-throwing, and the
        // UPDATE is wrapped here so a D1 hiccup on one row doesn't
        // abort the loop for subsequent users.
        log('error', 'email.send.failed', {
          to: user.email,
          status: null,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
}

-- Implements REQ-DISC-003
--
-- Self-healing discovery loop: when every feed for a tag has been
-- evicted from `sources:{tag}` after 30 consecutive fetch failures,
-- the coordinator enqueues a re-discovery row stamped with a system
-- user id so the regular discovery cron repopulates the tag.
--
-- pending_discoveries.user_id has a NOT NULL REFERENCES users(id)
-- foreign key. Inserts with a synthetic user_id ('__system__') work
-- today only because the coordinator connection doesn't run
-- `PRAGMA foreign_keys = ON`. This migration installs a sentinel
-- users row with id '__system__' so the system-queued rows satisfy
-- the FK unconditionally — future call sites that enable the pragma
-- (e.g. account deletion) won't silently break the self-healing loop.
--
-- The sentinel row is never reachable via OAuth: GitHub cannot return
-- the literal string '__system__' as a numeric user id. email is set
-- to a non-deliverable @invalid.local domain (RFC 2606) so a mis-
-- queued outbound email would bounce rather than spam a real address.
-- digest_hour is left NULL so even if an authenticated session were
-- forged against this row the settings gate (REQ-SET-006) would
-- bounce it back to /settings.

INSERT OR IGNORE INTO users (
  id,
  email,
  gh_login,
  tz,
  digest_minute,
  email_enabled,
  refresh_window_start,
  refresh_count_24h,
  session_version,
  created_at
) VALUES (
  '__system__',
  'system@invalid.local',
  '__system__',
  'UTC',
  0,
  0,
  0,
  0,
  1,
  strftime('%s', 'now') * 1
);

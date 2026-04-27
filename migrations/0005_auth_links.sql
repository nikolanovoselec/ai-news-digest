-- Implements REQ-AUTH-007
-- Cross-provider user dedup. Without this table, signing in via GitHub and
-- then via Google with the same verified email creates two `users` rows
-- (different `id` shapes — bare numeric for GitHub, `google:<sub>` for
-- Google), and the daily-digest dispatcher fans out one email per row,
-- so the user receives the same digest twice.
--
-- New flow keyed off this table:
--   1. OAuth callback looks up `(provider, provider_sub)` here. If found,
--      that's the user_id — done.
--   2. If not found, the callback looks up `users` by verified email.
--      If a user with that email already exists (i.e. a different
--      provider beat us to it), we INSERT a new auth_links row pointing
--      to that existing user_id and reuse the row.
--   3. Only when neither lookup matches do we create a new users row
--      AND a new auth_links row in tandem.
--
-- This migration also performs a one-time merge for any duplicate-email
-- pairs that already exist in the database (e.g. the production case
-- where mafijozo@gmail.com signed in via both providers).
--
-- D1 forbids CREATE TEMP TABLE, so the merge is expressed as a series
-- of DML statements over plain `_merge_*` staging tables created and
-- dropped in this migration.

PRAGMA foreign_keys = ON;

-- 1. Create the alias table.
CREATE TABLE auth_links (
  provider     TEXT    NOT NULL,
  provider_sub TEXT    NOT NULL,
  user_id      TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  linked_at    INTEGER NOT NULL,
  PRIMARY KEY (provider, provider_sub)
);
CREATE INDEX idx_auth_links_user ON auth_links(user_id);

-- 2. Staging table — duplicate-email groups with their winner_id.
--    Winner = the row with MIN(created_at) within the email group;
--    ties broken by the row with the smallest id.
CREATE TABLE _merge_email_winners (
  email     TEXT NOT NULL PRIMARY KEY,
  winner_id TEXT NOT NULL
);

INSERT INTO _merge_email_winners (email, winner_id)
  SELECT u.email, u.id
    FROM users u
    JOIN (
      SELECT email, MIN(created_at) AS winner_created_at
        FROM users
        WHERE id != '__system__' AND email IS NOT NULL AND email != ''
        GROUP BY email
        HAVING COUNT(*) > 1
    ) g ON g.email = u.email
   WHERE u.id != '__system__'
     AND u.created_at = g.winner_created_at
   GROUP BY u.email
   HAVING u.id = MIN(u.id);

-- 3. Staging table — every (loser_id → winner_id) pair we need to merge.
CREATE TABLE _merge_user_merges (
  loser_id  TEXT NOT NULL PRIMARY KEY,
  winner_id TEXT NOT NULL
);

INSERT INTO _merge_user_merges (loser_id, winner_id)
  SELECT u.id, w.winner_id
    FROM users u
    JOIN _merge_email_winners w ON u.email = w.email
   WHERE u.id != '__system__'
     AND u.id != w.winner_id;

-- 4. Re-point child rows from loser → winner. INSERT OR IGNORE collapses
--    the case where the user has the same article starred under both
--    accounts (so the winner row already exists).
INSERT OR IGNORE INTO article_stars (user_id, article_id, starred_at)
  SELECT m.winner_id, s.article_id, s.starred_at
    FROM article_stars s
    JOIN _merge_user_merges m ON s.user_id = m.loser_id;

INSERT OR IGNORE INTO article_reads (user_id, article_id, read_at)
  SELECT m.winner_id, r.article_id, r.read_at
    FROM article_reads r
    JOIN _merge_user_merges m ON r.user_id = m.loser_id;

INSERT OR IGNORE INTO pending_discoveries (user_id, tag, added_at)
  SELECT m.winner_id, p.tag, p.added_at
    FROM pending_discoveries p
    JOIN _merge_user_merges m ON p.user_id = m.loser_id;

-- 5. Add auth_links rows for the loser provider/sub → winner BEFORE we
--    delete the loser users row (the loser's id encodes its provider
--    and provider_sub; once the row is gone we can't recover them).
INSERT OR IGNORE INTO auth_links (provider, provider_sub, user_id, linked_at)
  SELECT
    CASE WHEN u.id LIKE '%:%' THEN substr(u.id, 1, instr(u.id, ':') - 1) ELSE 'github' END,
    CASE WHEN u.id LIKE '%:%' THEN substr(u.id, instr(u.id, ':') + 1) ELSE u.id END,
    m.winner_id,
    COALESCE(u.created_at, CAST(strftime('%s', 'now') AS INTEGER))
    FROM users u
    JOIN _merge_user_merges m ON u.id = m.loser_id;

-- 6. Delete loser users. FK ON DELETE CASCADE on article_stars,
--    article_reads, pending_discoveries removes any unmigrated child
--    rows (e.g. if INSERT OR IGNORE above bounced because the winner
--    already had the same row).
DELETE FROM users WHERE id IN (SELECT loser_id FROM _merge_user_merges);

-- 7. Backfill auth_links for every surviving user. Each users row
--    contributes exactly one alias derived from its current id.
INSERT OR IGNORE INTO auth_links (provider, provider_sub, user_id, linked_at)
  SELECT
    CASE WHEN id LIKE '%:%' THEN substr(id, 1, instr(id, ':') - 1) ELSE 'github' END,
    CASE WHEN id LIKE '%:%' THEN substr(id, instr(id, ':') + 1) ELSE id END,
    id,
    COALESCE(created_at, CAST(strftime('%s', 'now') AS INTEGER))
  FROM users
  WHERE id != '__system__';

-- 8. Drop staging tables — single-use, not needed after this migration.
DROP TABLE _merge_user_merges;
DROP TABLE _merge_email_winners;

-- CF-028 / REQ-DISC-001: priority column for discovery drain ordering.
-- New users' first-tag discoveries get priority=10 so they're processed
-- in the next 2-min tick rather than waiting up to 10 mins behind the
-- steady-state queue.
ALTER TABLE pending_discoveries ADD COLUMN priority INTEGER NOT NULL DEFAULT 0;

-- Composite index matches the drain query's ORDER BY MAX(priority) DESC,
-- MIN(added_at) ASC. SQLite can serve the GROUP BY tag scan from this
-- index without a separate sort step.
CREATE INDEX IF NOT EXISTS idx_pending_discoveries_priority_created
  ON pending_discoveries(priority DESC, added_at ASC);

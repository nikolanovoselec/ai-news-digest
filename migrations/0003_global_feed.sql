-- Implements REQ-PIPE-004
-- Schema reset for global-feed rework. Pre-launch, data loss acceptable.

DROP TABLE IF EXISTS articles;
DROP TABLE IF EXISTS digests;

CREATE TABLE articles (
  id                  TEXT PRIMARY KEY,       -- ULID
  canonical_url       TEXT NOT NULL UNIQUE,
  primary_source_name TEXT NOT NULL,
  primary_source_url  TEXT NOT NULL,
  title               TEXT NOT NULL,
  details_json        TEXT NOT NULL,          -- JSON array of 1-3 strings
  tags_json           TEXT NOT NULL,          -- JSON array of tag slugs
  published_at        INTEGER NOT NULL,
  ingested_at         INTEGER NOT NULL,
  scrape_run_id       TEXT NOT NULL
);
CREATE INDEX idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX idx_articles_canonical_url ON articles(canonical_url);

CREATE TABLE article_sources (
  article_id   TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  source_name  TEXT NOT NULL,
  source_url   TEXT NOT NULL,
  published_at INTEGER,
  PRIMARY KEY (article_id, source_url)
);

CREATE TABLE article_tags (
  article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  tag        TEXT NOT NULL,
  PRIMARY KEY (article_id, tag)
);
CREATE INDEX idx_article_tags_tag_article ON article_tags(tag, article_id);

CREATE TABLE article_stars (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  starred_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, article_id)
);
CREATE INDEX idx_article_stars_user ON article_stars(user_id, starred_at DESC);

CREATE TABLE article_reads (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  read_at    INTEGER NOT NULL,
  PRIMARY KEY (user_id, article_id)
);

CREATE TABLE scrape_runs (
  id                 TEXT PRIMARY KEY,
  started_at         INTEGER NOT NULL,
  finished_at        INTEGER,
  articles_ingested  INTEGER NOT NULL DEFAULT 0,
  articles_deduped   INTEGER NOT NULL DEFAULT 0,
  tokens_in          INTEGER NOT NULL DEFAULT 0,
  tokens_out         INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd REAL    NOT NULL DEFAULT 0,
  model_id           TEXT    NOT NULL,
  chunk_count        INTEGER NOT NULL DEFAULT 0,
  status             TEXT    NOT NULL
);
CREATE INDEX idx_scrape_runs_started ON scrape_runs(started_at DESC);

ALTER TABLE users ADD COLUMN last_emailed_local_date TEXT;

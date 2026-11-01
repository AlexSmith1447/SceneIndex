-- SceneIndex shared, source-attributed historical archive (opt-in Cloudflare D1).
-- Run once against a new D1 database; NEVER store passwords or private posts.
CREATE TABLE IF NOT EXISTS archive_threads (
  id TEXT PRIMARY KEY,
  source_url TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  board TEXT NOT NULL DEFAULT 'Other Music',
  thread_date TEXT NOT NULL,
  year INTEGER NOT NULL,
  tags_json TEXT NOT NULL DEFAULT '[]',
  origin TEXT NOT NULL DEFAULT 'user-import',
  excerpt_only INTEGER NOT NULL DEFAULT 0,
  capture_url TEXT,
  imported_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE IF NOT EXISTS archive_posts (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES archive_threads(id) ON DELETE CASCADE,
  author TEXT NOT NULL DEFAULT 'Unknown',
  post_date TEXT NOT NULL,
  body TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'discussion',
  recommended_json TEXT NOT NULL DEFAULT '[]',
  liked_json TEXT NOT NULL DEFAULT '[]',
  origin TEXT NOT NULL DEFAULT 'user-import'
);
CREATE INDEX IF NOT EXISTS idx_threads_date ON archive_threads(thread_date DESC);
CREATE INDEX IF NOT EXISTS idx_threads_source ON archive_threads(source);
CREATE INDEX IF NOT EXISTS idx_posts_thread ON archive_posts(thread_id);
CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
  body, thread_id UNINDEXED, post_id UNINDEXED, tokenize='unicode61'
);

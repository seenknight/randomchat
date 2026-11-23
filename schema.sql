-- randomchat database schema (Cloudflare D1 / SQLite)
-- Fresh install: run this whole file.
-- Existing database from the first version: run migration.sql instead.

CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT    NOT NULL UNIQUE,
  gender     TEXT    NOT NULL CHECK (gender IN ('female', 'male')),
  age        INTEGER NOT NULL CHECK (age >= 18 AND age <= 100),
  city       TEXT,            -- as typed by the user
  city_key   TEXT,            -- normalized form used for matching
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Every introduction that was actually sent. user_a < user_b always,
-- so the same pair can never be introduced twice.
CREATE TABLE IF NOT EXISTS matches (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_a     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_a, user_b)
);

-- Admin-controlled switches (e.g. city_enabled = '1' / '0').
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT OR IGNORE INTO settings (key, value) VALUES ('city_enabled', '1');

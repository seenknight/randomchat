-- randomchat database schema (Cloudflare D1 / SQLite)

CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT    NOT NULL UNIQUE,
  gender     TEXT    NOT NULL CHECK (gender IN ('female', 'male')),
  age        INTEGER NOT NULL CHECK (age >= 18 AND age <= 100),
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

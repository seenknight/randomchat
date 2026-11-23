-- Upgrade an EXISTING randomchat database (version 1) to support cities.
-- Run these statements ONE BY ONE in the Cloudflare D1 console (each in its own run).
-- Existing users keep working; they simply have no city.

ALTER TABLE users ADD COLUMN city TEXT;
ALTER TABLE users ADD COLUMN city_key TEXT;
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT OR IGNORE INTO settings (key, value) VALUES ('city_enabled', '1');

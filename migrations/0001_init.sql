-- Migration number: 0001 	 init

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE clubs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE club_members (
  club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (club_id, user_id)
);

CREATE TABLE runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  host_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  -- unix epoch seconds, UTC; runs with starts_at in the past are "completed"
  starts_at INTEGER NOT NULL,
  location TEXT,
  distance_km REAL,
  pace TEXT,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE run_attendees (
  run_id INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (run_id, user_id)
);

CREATE TABLE kudos (
  run_id INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (run_id, user_id)
);

CREATE INDEX idx_runs_club ON runs(club_id);
CREATE INDEX idx_runs_starts_at ON runs(starts_at);

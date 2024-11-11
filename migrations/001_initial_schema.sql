CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  name TEXT,
  password TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  userEmail TEXT NOT NULL,
  text TEXT NOT NULL,
  tags TEXT DEFAULT '[]',
  metadata TEXT DEFAULT '{}',
  sharing TEXT DEFAULT '{"isPublic":false,"sharedWith":[],"permissions":[]}',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(userEmail) REFERENCES users(email) ON DELETE CASCADE
);

CREATE INDEX idx_notes_userEmail ON notes(userEmail);
CREATE INDEX idx_notes_created_at ON notes(created_at);

CREATE TABLE IF NOT EXISTS memory_folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  userEmail TEXT NOT NULL,
  description TEXT,
  isPrivate INTEGER NOT NULL DEFAULT 1,
  tags TEXT NOT NULL DEFAULT '[]',
  parentId TEXT,
  sharing TEXT NOT NULL DEFAULT '{"isPublic":false,"sharedWith":[],"permissions":[]}',
  metadata TEXT NOT NULL DEFAULT '{"noteCount":0,"lastAccessed":null}',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(parentId) REFERENCES memory_folders(id) ON DELETE CASCADE,
  FOREIGN KEY(userEmail) REFERENCES users(email) ON DELETE CASCADE
);

CREATE INDEX idx_memory_folders_userEmail ON memory_folders(userEmail);
CREATE INDEX idx_memory_folders_parentId ON memory_folders(parentId);

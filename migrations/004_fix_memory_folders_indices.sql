-- Drop existing indices if they exist
DROP INDEX IF EXISTS idx_memory_folders_userEmail;
DROP INDEX IF EXISTS idx_memory_folders_parentId;

-- Recreate indices
CREATE INDEX IF NOT EXISTS idx_memory_folders_userEmail ON memory_folders(userEmail);
CREATE INDEX IF NOT EXISTS idx_memory_folders_parentId ON memory_folders(parentId);

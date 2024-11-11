// Enums with descriptions
export enum ThemeMode {
  System = 'system',
  Light = 'light',
  Dark = 'dark'
}

export enum AuthStatus {
  Idle = 'idle',
  Loading = 'loading',
  Authenticated = 'authenticated',
  Unauthenticated = 'unauthenticated',
  Locked = 'locked', // Added for account security
  RequiresMFA = 'requires_mfa' // Added for 2FA support
}

export enum UserRole {
  User = 'user',
  Admin = 'admin',
  Moderator = 'moderator'
}

export enum AccountStatus {
  Active = 'active',
  Inactive = 'inactive',
  Suspended = 'suspended',
  PendingVerification = 'pending_verification'
}

export enum NotificationType {
  Success = 'success',
  Error = 'error',
  Warning = 'warning',
  Info = 'info'
}

// Enhanced types with security features
export interface User {
  id: string;
  email: string;
  passwordHash: string; // Renamed from password for clarity
  passwordSalt: string; // Added for security
  mfaEnabled: boolean; // 2FA support
  mfaSecret?: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  role: UserRole;
  status: AccountStatus;
  preferences: UserPreferences;
  metadata: UserMetadata;
  loginAttempts: number;
  lastLoginAt?: Date;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface UserMetadata {
  lastPasswordChange: Date;
  lastActivity: Date;
  deviceInfo?: {
    userAgent: string;
    ip: string;
    location?: string;
  };
  tags?: string[];
}

export interface UserPreferences {
  theme: ThemeMode;
  notifications: boolean;
  language: string;
  timezone: string;
  emailNotifications: {
    security: boolean;
    updates: boolean;
    marketing: boolean;
  };
  privacy: {
    isProfilePublic: boolean;
    showEmail: boolean;
  };
}

export interface Note {
  id: string;
  userEmail: string;
  text: string;
  tags?: string[];
  metadata: {
    wordCount: number;
    language?: string;
    sentiment?: number;
  };
  sharing: {
    isPublic: boolean;
    sharedWith: string[]; // User emails
    permissions: string[]; // read, write, etc
  };
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface FolderMetadata {
  noteCount: number;
  lastAccessed: Date;
  vectorId?: string;
}

interface FolderSharing {
  isPublic: boolean;
  sharedWith: string[];
  permissions: string[];
}

export interface MemoryFolder {
  id: string;
  name: string;
  userEmail: string;
  description?: string;
  isPrivate: boolean;
  tags: string[];
  parentId?: string;
  sharing: FolderSharing;
  metadata: FolderMetadata;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

// Enhanced state management
export interface AppState {
  auth: AuthState;
  user: UserState;
  ui: UIState;
  notes: NotesState;
  memory: MemoryState;
  search: SearchState;
}

export interface AuthState {
  status: AuthStatus;
  error: string | null;
  token: string | null;
  mfaPending: boolean;
  lastAttempt?: Date;
}

export interface UserState {
  data: User | null;
  preferences: UserPreferences;
  loading: boolean;
  error: string | null;
}

export interface UIState {
  theme: ThemeMode;
  sidebar: {
    isOpen: boolean;
    width: number;
  };
  notifications: Notification[];
}

export interface NotesState {
  items: Note[];
  loading: boolean;
  error: string | null;
}

export interface MemoryState {
  folders: MemoryFolder[];
  loading: boolean;
  error: string | null;
}

export interface SearchState {
  query: string;
  filters: {
    tags?: string[];
    dateRange?: {
      start: Date;
      end: Date;
    };
    folders?: string[];
  };
  results: Array<Note | MemoryFolder>;
  loading: boolean;
  error: string | null;
}

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

// Environment configuration
export type Env = {
  AI: Ai;
  DATABASE: D1Database;
  RAG_WORKFLOW: Workflow;
  VECTOR_INDEX: VectorizeIndex;
  USERS_KV: KVNamespace;
  SESSIONS_DO: DurableObjectNamespace;
  AUTH_SECRET: string;
  SMTP_CONFIG: {
    host: string;
    port: number;
    user: string;
    pass: string;
  };
  S3_BUCKET: R2Bucket;

  // Add Variables type for context variables
  Variables: {
    requestId: string;
    userEmail?: string;
    session?: any; // You can make this more specific based on your session type
  };
};

export type Params = {
  text: string;
  userEmail?: string;
  metadata?: Record<string, unknown>;
  options?: {
    language?: string;
    sensitivity?: number;
    maxTokens?: number;
  };
};

import { Env } from '../types';

export class MemoryService {
  constructor(private env: Env) {}

  async createFolder(userEmail: string, data: Partial<MemoryFolder>): Promise<MemoryFolder> {
    try {
      // Fix AI model name and type
      const embedding = await this.env.AI.run('@cf/baai/bge-base-en-v1.5', {
        text: [data.description || data.name || '']
      });

      // Store vector embedding
      const vectorResponse = await this.env.VECTOR_INDEX.upsert([{
        id: crypto.randomUUID(),
        values: embedding.data[0],
        metadata: {
          type: 'folder',
          userEmail,
          created_at: new Date().toISOString()
        }
      }]);

      if (!vectorResponse || !Array.isArray(vectorResponse)) {
        throw new AppError('Failed to create vector embedding', 'VECTOR_ERROR');
      }

      const folder: MemoryFolder = {
        id: crypto.randomUUID(),
        name: data.name || 'Untitled Folder',
        userEmail,
        description: data.description,
        isPrivate: data.isPrivate ?? true,
        tags: data.tags || [],
        parentId: data.parentId,
        sharing: {
          isPublic: false,
          sharedWith: [],
          permissions: []
        },
        metadata: {
          noteCount: 0,
          lastAccessed: new Date(),
          vectorId: vectorResponse[0].id
        },
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store folder in D1
      await this.env.DATABASE.prepare(`
        INSERT INTO memory_folders (
          id, name, userEmail, description, isPrivate, tags,
          parentId, sharing, metadata, version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        folder.id,
        folder.name,
        folder.userEmail,
        folder.description,
        folder.isPrivate ? 1 : 0,
        JSON.stringify(folder.tags),
        folder.parentId,
        JSON.stringify(folder.sharing),
        JSON.stringify(folder.metadata),
        folder.version,
        folder.createdAt.toISOString(),
        folder.updatedAt.toISOString()
      ).run();

      return folder;
    } catch (error) {
      console.error('Failed to create memory folder:', error);
      throw new AppError(
        'Failed to create memory folder',
        'MEMORY_CREATE_ERROR',
        500,
        { error }
      );
    }
  }

  async getFolders(userEmail: string, parentId?: string): Promise<MemoryFolder[]> {
    try {
      const { results } = await this.env.DATABASE.prepare(`
        SELECT * FROM memory_folders
        WHERE userEmail = ? AND (parentId ${parentId ? '= ?' : 'IS NULL'})
        ORDER BY created_at DESC
      `).bind(
        userEmail,
        ...(parentId ? [parentId] : [])
      ).all();

      return results.map(this.mapFolderFromDb);
    } catch (error) {
      console.error('Failed to fetch memory folders:', error);
      throw new AppError(
        'Failed to fetch memory folders',
        'MEMORY_FETCH_ERROR',
        500,
        { error }
      );
    }
  }

  async updateFolder(id: string, userEmail: string, data: Partial<MemoryFolder>): Promise<MemoryFolder> {
    try {
      const folder = await this.getFolder(id, userEmail);
      if (!folder) {
        throw new AppError('Folder not found', 'MEMORY_NOT_FOUND', 404);
      }

      const updatedFolder: MemoryFolder = {
        ...folder,
        ...data,
        updatedAt: new Date(),
        version: folder.version + 1,
        metadata: {
          ...folder.metadata,
          ...(data.metadata || {})
        }
      };

      await this.env.DATABASE.prepare(`
        UPDATE memory_folders SET
        name = ?, description = ?, isPrivate = ?, tags = ?,
        sharing = ?, metadata = ?, version = ?, updated_at = ?
        WHERE id = ? AND userEmail = ?
      `).bind(
        updatedFolder.name,
        updatedFolder.description,
        updatedFolder.isPrivate ? 1 : 0,
        JSON.stringify(updatedFolder.tags),
        JSON.stringify(updatedFolder.sharing),
        JSON.stringify(updatedFolder.metadata),
        updatedFolder.version,
        updatedFolder.updatedAt.toISOString(),
        id,
        userEmail
      ).run();

      return updatedFolder;
    } catch (error) {
      console.error('Failed to update memory folder:', error);
      throw new AppError(
        'Failed to update memory folder',
        'MEMORY_UPDATE_ERROR',
        500,
        { error }
      );
    }
  }

  async deleteFolder(id: string, userEmail: string): Promise<void> {
    try {
      const folder = await this.getFolder(id, userEmail);
      if (!folder) {
        throw new AppError('Folder not found', 'MEMORY_NOT_FOUND', 404);
      }

      // Delete vector embedding if exists
      if (folder.metadata.vectorId) {
        await this.env.VECTOR_INDEX.deleteByIds([folder.metadata.vectorId]);
      }

      // Delete folder and all subfolders
      await this.env.DATABASE.prepare(`
        DELETE FROM memory_folders
        WHERE (id = ? OR parentId = ?) AND userEmail = ?
      `).bind(id, id, userEmail).run();
    } catch (error) {
      console.error('Failed to delete memory folder:', error);
      throw new AppError(
        'Failed to delete memory folder',
        'MEMORY_DELETE_ERROR',
        500,
        { error }
      );
    }
  }

  private async getFolder(id: string, userEmail: string): Promise<MemoryFolder | null> {
    const { results } = await this.env.DATABASE.prepare(`
      SELECT * FROM memory_folders WHERE id = ? AND userEmail = ?
    `).bind(id, userEmail).all();

    return results[0] ? this.mapFolderFromDb(results[0]) : null;
  }

  private mapFolderFromDb(row: any): MemoryFolder {
    return {
      id: row.id,
      name: row.name,
      userEmail: row.userEmail,
      description: row.description,
      isPrivate: Boolean(row.isPrivate),
      tags: JSON.parse(row.tags),
      parentId: row.parentId || undefined,
      sharing: JSON.parse(row.sharing),
      metadata: JSON.parse(row.metadata),
      version: row.version,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

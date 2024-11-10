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

export interface MemoryFolder {
  id: string;
  name: string;
  userEmail: string;
  description?: string;
  isPrivate: boolean;
  tags?: string[];
  sharing: {
    isPublic: boolean;
    sharedWith: string[];
    permissions: string[];
  };
  metadata: {
    noteCount: number;
    lastAccessed: Date;
  };
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

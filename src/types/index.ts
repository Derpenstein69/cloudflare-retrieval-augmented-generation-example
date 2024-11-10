// Enums
export enum ThemeMode {
  System = 'system',
  Light = 'light',
  Dark = 'dark'
}

export enum AuthStatus {
  Idle = 'idle',
  Loading = 'loading',
  Authenticated = 'authenticated',
  Unauthenticated = 'unauthenticated'
}

export enum NotificationType {
  Success = 'success',
  Error = 'error',
  Warning = 'warning',
  Info = 'info'
}

// Enhanced types
export interface User {
  email: string;
  password: string; // This should be the hashed password
  displayName?: string;
  bio?: string;
  preferences?: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  theme: ThemeMode;
  notifications: boolean;
  language: string;
}

export interface Note {
  id: string;
  userEmail: string;
  text: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryFolder {
  id: string;
  name: string;
  userEmail: string;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppState {
  auth: AuthState;
  user: UserState;
  ui: UIState;
  notes: NotesState;
  memory: MemoryState;
}

export interface AuthState {
  status: AuthStatus;
  error: string | null;
  token: string | null;
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

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

export type Env = {
  AI: Ai;
  DATABASE: D1Database;
  RAG_WORKFLOW: Workflow;
  VECTOR_INDEX: VectorizeIndex;
  USERS_KV: KVNamespace;
  SESSIONS_DO: DurableObjectNamespace;
};

export type Params = {
  text: string;
  userEmail?: string; // Make optional for backward compatibility
};


import type { AppState, User, Note, MemoryFolder, Notification } from '../types';
import { ThemeMode, AuthStatus, NotificationType } from '../types';

class StateManager {
  private static instance: StateManager;
  private state: AppState;
  private subscribers: Set<(state: AppState) => void>;

  private constructor() {
    this.subscribers = new Set();
    this.state = this.getInitialState();
  }

  static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  private getInitialState(): AppState {
    return {
      auth: {
        status: AuthStatus.Idle,
        error: null,
        token: null,
      },
      user: {
        data: null,
        preferences: {
          theme: ThemeMode.System,
          notifications: true,
          language: 'en',
        },
        loading: false,
        error: null,
      },
      ui: {
        theme: ThemeMode.System,
        sidebar: {
          isOpen: true,
          width: 240,
        },
        notifications: [],
      },
      notes: {
        items: [],
        loading: false,
        error: null,
      },
      memory: {
        folders: [],
        loading: false,
        error: null,
      },
    };
  }

  getState(): AppState {
    return this.state;
  }

  private setState(newState: Partial<AppState>) {
    this.state = { ...this.state, ...newState };
    this.notifySubscribers();
  }

  subscribe(callback: (state: AppState) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => callback(this.state));
  }

  // Auth actions
  setAuthStatus(status: AuthStatus, error?: string) {
    this.setState({
      auth: {
        ...this.state.auth,
        status,
        error: error || null,
      },
    });
  }

  // User actions
  setUser(user: User | null) {
    this.setState({
      user: {
        ...this.state.user,
        data: user,
        loading: false,
        error: null,
      },
    });
  }

  // UI actions
  setTheme(theme: ThemeMode) {
    this.setState({
      ui: {
        ...this.state.ui,
        theme,
      },
    });
  }

  toggleSidebar() {
    this.setState({
      ui: {
        ...this.state.ui,
        sidebar: {
          ...this.state.ui.sidebar,
          isOpen: !this.state.ui.sidebar.isOpen,
        },
      },
    });
  }

  addNotification(notification: Omit<Notification, 'id'>) {
    const id = crypto.randomUUID();
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration || 3000,
    };

    this.setState({
      ui: {
        ...this.state.ui,
        notifications: [...this.state.ui.notifications, newNotification],
      },
    });

    setTimeout(() => this.removeNotification(id), newNotification.duration);
  }

  removeNotification(id: string) {
    this.setState({
      ui: {
        ...this.state.ui,
        notifications: this.state.ui.notifications.filter(n => n.id !== id),
      },
    });
  }

  // Notes actions
  setNotes(notes: Note[]) {
    this.setState({
      notes: {
        ...this.state.notes,
        items: notes,
        loading: false,
        error: null,
      },
    });
  }

  addNote(note: Note) {
    this.setState({
      notes: {
        ...this.state.notes,
        items: [...this.state.notes.items, note],
      },
    });
  }

  // Memory actions
  setMemoryFolders(folders: MemoryFolder[]) {
    this.setState({
      memory: {
        ...this.state.memory,
        folders,
        loading: false,
        error: null,
      },
    });
  }

  addMemoryFolder(folder: MemoryFolder) {
    this.setState({
      memory: {
        ...this.state.memory,
        folders: [...this.state.memory.folders, folder],
      },
    });
  }
}

export const state = StateManager.getInstance();

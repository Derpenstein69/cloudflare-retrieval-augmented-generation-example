import type { AppState, User, Note, MemoryFolder, Notification } from '../types';
import { ThemeMode, AuthStatus, NotificationType } from '../types';

interface StateHistory {
  past: AppState[];
  future: AppState[];
}

class StateManager {
  // ... other code remains the same ...

  private loadState(): AppState | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('app_state');
        return saved ? JSON.parse(saved) : null;
      }
      return null;
    } catch (error) {
      console.error('Failed to load state:', error);
      return null;
    }
  }

  private saveState(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('app_state', JSON.stringify(this.state));
      }
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  // ... rest of the code remains the same
}

  addMiddleware(fn: (state: AppState, action: string) => void): void {
    this.middlewares.push(fn);
  }

  private runMiddlewares(action: string): void {
    this.middlewares.forEach(fn => fn(this.state, action));
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => callback(this.state));
  }

  // Enhanced actions with error handling
  setAuthStatus(status: AuthStatus, error?: string) {
    try {
      this.setState({
        auth: {
          ...this.state.auth,
          status,
          error: error || null,
        },
      }, 'SET_AUTH_STATUS');
    } catch (error) {
      console.error('Failed to set auth status:', error);
      this.addNotification({
        type: NotificationType.Error,
        message: 'Failed to update authentication status'
      });
    }
  }

  setUser(user: User | null) {
    try {
      this.setState({
        user: {
          ...this.state.user,
          data: user,
          loading: false,
          error: null,
        },
      }, 'SET_USER');
    } catch (error) {
      console.error('Failed to set user:', error);
      this.addNotification({
        type: NotificationType.Error,
        message: 'Failed to update user data'
      });
    }
  }

  setTheme(theme: ThemeMode) {
    this.setState({
      ui: {
        ...this.state.ui,
        theme,
      },
    }, 'SET_THEME');
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
    }, 'TOGGLE_SIDEBAR');
  }

  addNotification(notification: Omit<Notification, 'id'>) {
    try {
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
      }, 'ADD_NOTIFICATION');

      setTimeout(() => this.removeNotification(id), newNotification.duration);
    } catch (error) {
      console.error('Failed to add notification:', error);
    }
  }

  removeNotification(id: string) {
    this.setState({
      ui: {
        ...this.state.ui,
        notifications: this.state.ui.notifications.filter(n => n.id !== id),
      },
    }, 'REMOVE_NOTIFICATION');
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
    }, 'SET_NOTES');
  }

  addNote(note: Note) {
    this.setState({
      notes: {
        ...this.state.notes,
        items: [...this.state.notes.items, note],
      },
    }, 'ADD_NOTE');
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
    }, 'SET_MEMORY_FOLDERS');
  }

  addMemoryFolder(folder: MemoryFolder) {
    this.setState({
      memory: {
        ...this.state.memory,
        folders: [...this.state.memory.folders, folder],
      },
    }, 'ADD_MEMORY_FOLDER');
  }
}

export const state = StateManager.getInstance();

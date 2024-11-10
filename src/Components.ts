import { baseLayout, sharedStyles, themeScript } from './shared';
import { api } from './api-service';
import { state } from './state';
import {
  AuthStatus,
  NotificationType,
  ThemeMode,
  User,
  Note,
  MemoryFolder,
  AppState,
  UserPreferences,
  UIState,
  AuthState
} from './types';

// Theme configuration
const themeConfig = {
  light: {
    '--primary-bg': '#ffffff',
    '--secondary-bg': '#f5f5f5',
    '--accent-color': '#007bff',
    '--text-primary': '#333333',
    '--text-secondary': '#666666',
    '--border-color': '#dddddd',
    '--error-color': '#dc3545',
    '--success-color': '#28a745',
    '--warning-color': '#ffc107',
    '--shadow-color': 'rgba(0,0,0,0.1)',
    '--input-bg': '#ffffff',
    '--input-text': '#333333',
    '--button-primary-bg': '#007bff',
    '--button-primary-text': '#ffffff',
  },
  dark: {
    '--primary-bg': '#1a1a1a',
    '--secondary-bg': '#2d2d2d',
    '--accent-color': '#4dabf7',
    '--text-primary': '#ffffff',
    '--text-secondary': '#bbbbbb',
    '--border-color': '#404040',
    '--error-color': '#ff4444',
    '--success-color': '#4caf50',
    '--warning-color': '#ffeb3b',
    '--shadow-color': 'rgba(0,0,0,0.3)',
    '--input-bg': '#333333',
    '--input-text': '#ffffff',
    '--button-primary-bg': '#4dabf7',
    '--button-primary-text': '#ffffff',
  }
};

// Shared styles and theme script that was previously in shared.ts
export const sharedStyles = `
  <style>
    :root {
      ${Object.entries(themeConfig.light)
        .map(([prop, value]) => `${prop}: ${value};`)
        .join('\n      ')}
    }

    @media (prefers-color-scheme: dark) {
      :root {
        ${Object.entries(themeConfig.dark)
          .map(([prop, value]) => `${prop}: ${value};`)
          .join('\n      ')}
      }
    }

    body {
      margin: 0;
      padding: 0;
      background-color: var(--primary-bg);
      color: var(--text-primary);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .content {
      background-color: var(--secondary-bg);
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 4px 6px var(--shadow-color);
      width: 100%;
      max-width: 400px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      background-color: var(--secondary-bg);
      color: var(--text-primary);
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      border-bottom: 1px solid var(--border-color);
    }
    .title {
      text-align: center;
      flex-grow: 1;
    }
    .theme-toggle {
      cursor: pointer;
    }
    .user-icon {
      cursor: pointer;
      position: relative;
    }
    .menu {
      display: none;
      position: absolute;
      right: 0;
      top: 100%;
      background-color: var(--secondary-bg);
      color: var(--text-primary);
      box-shadow: 0 4px 8px var(--shadow-color);
      list-style: none;
      padding: 0;
      margin: 0;
      min-width: 150px;
      border: 1px solid var(--border-color);
    }
    .menu-item {
      padding: 10px;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .menu-item:hover {
      background-color: var(--primary-bg);
    }
    .sidebar {
      width: 200px;
      background-color: var(--secondary-bg);
      color: var(--text-primary);
      position: fixed;
      top: 40px; /* Adjusted to be directly below the action bar */
      left: 0;
      height: calc(100% - 40px); /* Adjusted to account for the action bar height */
      display: block; /* Changed from none to block for initial state */
    }
    .sidebar-item {
      padding: 10px;
      cursor: pointer;
    }
    .sidebar-item:hover {
      background-color: #c0c0c0; /* Slightly darker grey for hover effect */
    }
    .content {
      margin-top: 50px; /* Adjusted to account for the action bar height */
      margin-left: 200px; /* Set initial margin to match sidebar width */
      transition: margin-left 0.3s;
      padding: 20px; /* Add some padding */
    }
    .content.collapsed {
      margin-left: 0; /* Changed from expanded to collapsed pattern */
    }
    .home-button {
      cursor: pointer;
      margin-left: 10px;
    }
    .folders {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
      margin-top: 20px;
    }
    .folder {
      background-color: var(--secondary-bg);
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 6px var(--shadow-color);
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .folder:hover {
      background-color: var(--primary-bg);
    }
    .light-mode {
      --primary-color: white;
      --secondary-color: #d3d3d3;
      --text-color: black;
    }
    .dark-mode {
      --primary-color: #1a1a1a;
      --secondary-color: #333;
      --text-color: white;
    }
    .toast {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 10px 20px;
        const icon = document.querySelector('.theme-toggle');
        switch(theme) {
          case 'system':
            icon.textContent = '🌓';
            break;
          case 'dark':
            icon.textContent = '🌙';
            break;
          case 'light':
            icon.textContent = '☀️';
            break;
        }
      }

      function toggleTheme() {
        const currentTheme = localStorage.getItem('theme') || 'system';
        const themes = ['system', 'light', 'dark'];
        const nextIndex = (themes.indexOf(currentTheme) + 1) % themes.length;
        const newTheme = themes[nextIndex];
        setTheme(newTheme);

        if (newTheme === 'system') {
          const systemTheme = getSystemTheme();
          document.documentElement.classList.toggle('dark-mode', systemTheme === 'dark');
        }
      }

      document.addEventListener('DOMContentLoaded', () => {
        try {
          const savedTheme = localStorage.getItem('theme') || 'system';
          setTheme(savedTheme);

          if (savedTheme === 'system') {
            const systemTheme = getSystemTheme();
            document.documentElement.classList.toggle('dark-mode', systemTheme === 'dark');
          }
        } catch (err) {
          console.error('Theme initialization error:', err);
          // Fallback to light theme
          document.documentElement.classList.add('light-mode');
        }
      });
    } catch (err) {
      console.error('Theme script error:', err);
    }
  </script>
`;

// Fix duplicate theme script and add missing functions
export const themeScript = `
<script>
  const ThemeManager = {
    getSystemTheme() {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    },

    setTheme(theme) {
      const root = document.documentElement;
      root.classList.remove('light-mode', 'dark-mode');
      if (theme !== 'system') {
        root.classList.add(theme + '-mode');
      }
      localStorage.setItem('theme', theme);
      this.updateThemeToggleIcon(theme);
      state.setTheme(theme);
    },

    updateThemeToggleIcon(theme) {
      const icon = document.querySelector('.theme-toggle');
      if (icon) {
        icon.textContent = {
          system: '🌓',
          dark: '🌙',
          light: '☀️'
        }[theme];
      }
    },

    toggleTheme() {
      const currentTheme = localStorage.getItem('theme') || 'system';
      const themes = ['system', 'light', 'dark'];
      const nextIndex = (themes.indexOf(currentTheme) + 1) % themes.length;
      const newTheme = themes[nextIndex];
      this.setTheme(newTheme);

      if (newTheme === 'system') {
        const systemTheme = this.getSystemTheme();
        document.documentElement.classList.toggle('dark-mode', systemTheme === 'dark');
      }
    },

    init() {
      try {
        const savedTheme = localStorage.getItem('theme') || 'system';
        this.setTheme(savedTheme);

        if (savedTheme === 'system') {
          const systemTheme = this.getSystemTheme();
          document.documentElement.classList.toggle('dark-mode', systemTheme === 'dark');
        }

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
          if (localStorage.getItem('theme') === 'system') {
            document.documentElement.classList.toggle('dark-mode', e.matches);
          }
        });
      } catch (err) {
        console.error('Theme initialization error:', err);
        document.documentElement.classList.add('light-mode');
      }
    }
  };

  // Initialize theme system
  document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
</script>`;

// Client-Side Router
export const router = `
<script>
  class Router {
    constructor() {
      this.routes = new Map();
      this.currentPath = window.location.pathname;

      window.addEventListener('popstate', () => this.handleRoute(window.location.pathname));
    }

    addRoute(path, handler) {
      this.routes.set(path, handler);
    }

    async handleRoute(path, pushState = false) {
      try {
        const handler = this.routes.get(path) || this.routes.get('*');
        if (handler) {
          if (pushState) {
            history.pushState(null, '', path);
          }
          this.currentPath = path;
          await handler();
        }
      } catch (error) {
        console.error('Routing error:', error);
        EventHandlers.showError('Navigation failed');
      }
    }

    async navigate(path) {
      await this.handleRoute(path, true);
    }

    init() {
      this.handleRoute(this.currentPath);
    }
  }

  const appRouter = new Router();

  // Define routes
  appRouter.addRoute('/', async () => await EventHandlers.loadContent('/'));
  appRouter.addRoute('/login', async () => await EventHandlers.loadContent('/login'));
  appRouter.addRoute('/signup', async () => await EventHandlers.loadContent('/signup'));
  appRouter.addRoute('/profile', async () => await EventHandlers.loadContent('/profile'));
  appRouter.addRoute('/settings', async () => await EventHandlers.loadContent('/settings'));
  appRouter.addRoute('/notes', async () => await EventHandlers.loadContent('/notes'));
  appRouter.addRoute('/memory', async () => await EventHandlers.loadContent('/memory'));
  appRouter.addRoute('*', async () => await EventHandlers.loadContent('/404'));

  // Initialize router
  document.addEventListener('DOMContentLoaded', () => appRouter.init());
</script>
`;

// Centralized Event Handlers
import { state } from './state';
import { AuthStatus, NotificationType, ThemeMode } from './types';

// ...rest of imports...

// Update event handlers to use state management
export const eventHandlers = `
<script>
  const EventHandlers = {
    async loadContent(path) {
      try {
        state.setLoadingState(true);
        const response = await fetch(path);
        if (response.status === 302 || response.status === 401) {
          state.setAuthStatus(AuthStatus.Unauthenticated);
          window.location.href = '/login';
          return;
        }
        if (!response.ok) throw new Error('HTTP error! status: ' + response.status);
        const html = await response.text();
        document.getElementById('content').innerHTML = html;
        state.setLoadingState(false);
        return true;
      } catch (error) {
        state.setLoadingState(false);
        state.addNotification({
          type: NotificationType.Error,
          message: 'Failed to load content'
        });
        return false;
      }
    },

    async handleLogin(event) {
      event.preventDefault();
      try {
        state.setAuthStatus(AuthStatus.Loading);
        const form = event.target;
        const { email, password } = Object.fromEntries(new FormData(form));

        const response = await api.login(email, password);
        if (response.error) throw new Error(response.error);

        state.setAuthStatus(AuthStatus.Authenticated);
        state.setUser(response.data.user);
        appRouter.navigate('/');
      } catch (error) {
        state.setAuthStatus(AuthStatus.Unauthenticated, error.message);
        state.addNotification({
          type: NotificationType.Error,
          message: 'Login failed: ' + error.message
        });
      }
    },

    async handleSignup(event) {
      event.preventDefault();
      try {
        state.setAuthStatus(AuthStatus.Loading);
        const form = event.target;
        const formData = new FormData(form);
        const { email, password, confirm_password } = Object.fromEntries(formData);

        if (password !== confirm_password) {
          throw new Error('Passwords do not match');
        }

        const response = await api.signup(email, password);
        if (response.error) throw new Error(response.error);

        state.setAuthStatus(AuthStatus.Authenticated);
        state.setUser(response.data.user);
        appRouter.navigate('/');
      } catch (error) {
        state.setAuthStatus(AuthStatus.Unauthenticated, error.message);
        state.addNotification({
          type: NotificationType.Error,
          message: 'Signup failed: ' + error.message
        });
      }
    },

    async handleLogout() {
      try {
        state.setAuthStatus(AuthStatus.Loading);
        const response = await api.logout();
        if (response.error) throw new Error(response.error);

        state.setAuthStatus(AuthStatus.Unauthenticated);
        state.setUser(null);
        window.location.href = '/login';
      } catch (error) {
        state.setAuthStatus(AuthStatus.Authenticated);
        state.addNotification({
          type: NotificationType.Error,
          message: 'Logout failed: ' + error.message
        });
      }
    },

    async handleProfileUpdate(event) {
      event.preventDefault();
      try {
        state.setLoadingState(true);
        const form = event.target;
        const data = Object.fromEntries(new FormData(form));

        const response = await api.updateProfile(data);
        if (response.error) throw new Error(response.error);

        state.setUser({ ...state.getState().user.data, ...response.data });
        state.addNotification({
          type: NotificationType.Success,
          message: 'Profile updated successfully'
        });
      } catch (error) {
        state.addNotification({
          type: NotificationType.Error,
          message: 'Failed to update profile: ' + error.message
        });
      } finally {
        state.setLoadingState(false);
      }
    },

    async handleSettingsUpdate(event) {
      event.preventDefault();
      try {
        state.setLoadingState(true);
        const form = event.target;
        const data = Object.fromEntries(new FormData(form));

        const response = await api.updateSettings(data);
        if (response.error) throw new Error(response.error);

        state.setUserPreferences(data);
        state.addNotification({
          type: NotificationType.Success,
          message: 'Settings updated successfully'
        });
      } catch (error) {
        state.addNotification({
          type: NotificationType.Error,
          message: 'Failed to update settings: ' + error.message
        });
      } finally {
        state.setLoadingState(false);
      }
    },

    async handleNoteSubmit(event) {
      event.preventDefault();
      try {
        state.setLoadingState(true);
        const form = event.target;
        const { text } = Object.fromEntries(new FormData(form));

        const response = await api.createNote(text);
        if (response.error) throw new Error(response.error);

        state.addNote(response.data);
        form.reset();
        state.addNotification({
          type: NotificationType.Success,
          message: 'Note created successfully'
        });
      } catch (error) {
        state.addNotification({
          type: NotificationType.Error,
          message: 'Failed to create note: ' + error.message
        });
      } finally {
        state.setLoadingState(false);
      }
    },

    async handleNoteDelete(id) {
      try {
        state.setLoadingState(true);
        const response = await api.deleteNote(id);
        if (response.error) throw new Error(response.error);

        state.removeNote(id);
        state.addNotification({
          type: NotificationType.Success,
          message: 'Note deleted successfully'
        });
      } catch (error) {
        state.addNotification({
          type: NotificationType.Error,
          message: 'Failed to delete note: ' + error.message
        });
      } finally {
        state.setLoadingState(false);
      }
    },

    async handleFolderCreate(name) {
      try {
        state.setLoadingState(true);
        const response = await api.createMemoryFolder(name);
        if (response.error) throw new Error(response.error);

        state.addMemoryFolder(response.data);
        state.addNotification({
          type: NotificationType.Success,
          message: 'Folder created successfully'
        });
      } catch (error) {
        state.addNotification({
          type: NotificationType.Error,
          message: 'Failed to create folder: ' + error.message
        });
      } finally {
        state.setLoadingState(false);
      }
    },

    updateTheme(theme) {
      try {
        state.setTheme(theme);
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        state.addNotification({
          type: NotificationType.Success,
          message: 'Theme updated successfully'
        });
      } catch (error) {
        state.addNotification({
          type: NotificationType.Error,
          message: 'Failed to update theme'
        });
      }
    },

    toggleSidebar() {
      try {
        state.toggleSidebar();
        const sidebar = document.getElementById('sidebar');
        const content = document.getElementById('content');
        const isOpen = state.getState().ui.sidebar.isOpen;

        sidebar.style.display = isOpen ? 'block' : 'none';
        content.classList.toggle('collapsed', !isOpen);
      } catch (error) {
        state.addNotification({
          type: NotificationType.Error,
          message: 'Failed to toggle sidebar'
        });
      }
    }
  };

  // Initialize state listeners
  state.subscribe((newState) => {
    try {
      // Update theme
      document.documentElement.setAttribute('data-theme', newState.ui.theme);

      // Update sidebar
      const sidebar = document.getElementById('sidebar');
      const content = document.getElementById('content');
      if (sidebar && content) {
        sidebar.style.display = newState.ui.sidebar.isOpen ? 'block' : 'none';
        content.classList.toggle('collapsed', !newState.ui.sidebar.isOpen);
      }

      // Update notifications
      const notificationsContainer = document.getElementById('notifications');
      if (notificationsContainer) {
        notificationsContainer.innerHTML = newState.ui.notifications
          .map(notification => `
            <div class="toast ${notification.type}">
              ${notification.message}
            </div>
          `)
          .join('');
      }

      // Update loading state
      document.body.classList.toggle('loading', newState.ui.loading);
    } catch (error) {
      console.error('State update error:', error);
    }
  });
</script>`;

// Fix folder template implementation
const folderTemplate = (name: string, isPrivate: boolean = false) => `
  <div class="folder-edit-menu">
    <button class="folder-edit-button" onclick="EventHandlers.handleFolderDelete(event, '${name}')">Delete</button>
    <button class="folder-edit-button" onclick="EventHandlers.handleFolderRename(event, '${name}')">Rename</button>
    <button class="folder-edit-button" onclick="EventHandlers.handleFolderPrivacy(event, '${name}', ${!isPrivate})">
      Make ${isPrivate ? 'Public' : 'Private'}
    </button>
  </div>
  <div class="folder-name">${name}</div>
  <input type="text" class="folder-name-edit" value="${name}" style="display: none;"
    onkeyup="EventHandlers.handleFolderNameKeyUp(event, '${name}')"
  >
`;

// Add memory management functions
const memoryScripts = `
<script>
  const MemoryManager = {
    async addFolder() {
      const name = prompt('Enter folder name:');
      if (name) {
        await EventHandlers.handleFolderCreate(name);
      }
    },

    async editLayout() {
      document.querySelectorAll('.folder-edit-menu').forEach(menu => {
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
      });
    },

    async addKnowledge() {
      const selectedFolder = state.getState().memory.selectedFolder;
      if (!selectedFolder) {
        state.addNotification({
          type: NotificationType.Warning,
          message: 'Please select a folder first'
        });
        return;
      }

      const text = prompt('Enter knowledge text:');
      if (text) {
        await EventHandlers.handleNoteSubmit({
          preventDefault: () => {},
          target: {
            text: { value: text },
            folderId: selectedFolder.id
          }
        });
      }
    }
  };

  // Initialize memory system
  document.addEventListener('DOMContentLoaded', () => {
    const memoryContainer = document.querySelector('.memory-container');
    if (memoryContainer) {
      memoryContainer.addEventListener('click', (e) => {
        if (e.target.closest('.folder-edit-menu')) {
          e.stopPropagation();
        }
      });
    }
  });
</script>`;

// Common Components
const commonHead = (title: string) => `
  <meta charset="UTF-8">
  <title>${title} | RusstCorp</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/water.css@2/out/water.css">
  ${sharedStyles}
`;

const actionBar = (showMenuToggle = true) => `
  <div class="action-bar">
    ${showMenuToggle ? '<div class="menu-toggle" onclick="toggleSidebar()">☰</div>' : ''}
    <div class="home-button" onclick="goHome()">🏠</div>
    <div class="title">RusstCorp</div>
    <div class="theme-toggle" onclick="toggleTheme()">🌓</div>
    <div class="user-icon" onclick="toggleMenu()">👤
      ${userMenu()}
    </div>
  </div>
`;

const userMenu = () => `
  <ul class="menu" id="user-menu">
    <li class="menu-item" onclick="loadContent('/profile')">Profile</li>
    <li class="menu-item" onclick="loadContent('/settings')">Settings</li>
    <li class="menu-item" onclick="handleLogout()">Logout</li>
  </ul>
`;

const sidebar = () => `
  <div class="sidebar" id="sidebar">
    <div class="sidebar-item" onclick="loadContent('/notes')">Notes</div>
    <div class="sidebar-item" onclick="loadContent('/memory')">Memory</div>
  </div>
`;

// Layout Template
const pageLayout = (title: string, content: string, options: { showSidebar?: boolean; showMenuToggle?: boolean } = {}) => `
<!DOCTYPE html>
<html>
<head>
  ${commonHead(title)}
</head>
<body>
  ${actionBar(options.showMenuToggle)}
  ${options.showSidebar ? sidebar() : ''}
  <div id="notifications"></div>
  <div class="content" id="content">
    ${content}
  </div>
  ${themeScript}
  ${router}
  ${eventHandlers}
  ${memoryScripts}
</body>
</html>
`;

// Update template functions to use pageLayout
export const templates = {
  login: () => pageLayout('Login', `
    <div class="auth-container">
      <h1>Login</h1>
      <form id="login-form" method="POST" action="/auth/login">
        <input type="email" name="email" placeholder="Email" required>
        <input type="password" name="password" placeholder="Password" required>
        <button type="submit">Login</button>
      </form>
      <p>Don't have an account? <a href="/signup">Sign up</a></p>
    </div>
  `, { showSidebar: false, showMenuToggle: false }),

  signup: () => pageLayout('Sign Up', `
    <div class="auth-container">
      <h1>Sign Up</h1>
      <form id="signup-form" action="/auth/signup" method="POST">
        <input type="email" name="email" placeholder="Email" required>
        <input type="password" name="password" placeholder="Password" minlength="8" required>
        <input type="password" name="confirm_password" placeholder="Confirm Password" minlength="8" required>
        <button type="submit">Sign Up</button>
      </form>
      <p>Already have an account? <a href="/login">Login</a></p>
    </div>
  `, { showSidebar: false, showMenuToggle: false }),

  home: () => pageLayout('Home', `
    <h1>RusstCorp - Complexity Simplified, with a side of style</h1>
  `, { showSidebar: true }),

  profile: () => pageLayout('Profile', `
    <h1>Profile</h1>
    <form id="profile-form" method="POST" action="/profile">
      <div>
        <input type="text" name="display_name" placeholder="Display Name" required>
      </div>
      <div>
        <textarea name="bio" placeholder="Bio" required></textarea>
      </div>
      <button type="submit">Update Profile</button>
    </form>
  `, { showSidebar: true }),

  settings: () => pageLayout('Settings', `
    <h1>Settings</h1>
    <div class="settings-container">
      <h1>Account Settings</h1>
      <form id="settings-form">
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" required>
        </div>
        <div class="form-group">
          <label for="current-password">Current Password</label>
          <input type="password" id="current-password" name="current_password">
        </div>
        <div class="form-group">
          <label for="new-password">New Password</label>
          <input type="password" id="new-password" name="new_password">
        </div>
        <div class="form-group">
          <label for="confirm-password">Confirm New Password</label>
          <input type="password" id="confirm-password" name="confirm_password">
        </div>
        <div>
          <label>Theme Preference</label>
          <select id="theme-select" onchange="updateThemePreference()">
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        <button type="submit">Save Changes</button>
      </form>
    </div>
  `, { showSidebar: true }),

  notes: () => pageLayout('Notes', `
    <h1>Notes</h1>
    <div>
      <h2>Notes</h2>
      <div id="notes-list">
        Loading notes...
      </div>
      <form id="note-form" onsubmit="handleNoteSubmit(event)">
        <textarea name="text" required placeholder="Enter your note"></textarea>
        <button type="submit">Save Note</button>
      </form>
    </div>
  `, { showSidebar: true }),

  memory: () => pageLayout('Memory Manager', `
    <div class="memory-menu-bar">
      <button class="memory-menu-button" onclick="addFolder()">Add Folder</button>
      <button class="memory-menu-button" onclick="editLayout()">Edit Layout</button>      <button class="memory-menu-button" onclick="addKnowledge()">Add Knowledge</button>    </div>    <div class="memory-container">      <h1>Memory Manager</h1>      <div class="folders">        <div class="folder" onclick="loadContent('/memory/work')">${folderTemplate('Work')}</div>        <div class="folder" onclick="loadContent('/memory/personal')">${folderTemplate('Personal')}</div>        <div class="folder" onclick="loadContent('/memory/family')">${folderTemplate('Family')}</div>        <div class="folder" onclick="loadContent('/memory/private')">${folderTemplate('Private')}</div>      </div>
    </div>
  `, { showSidebar: true })
};

// Error templates
export const errorTemplates = {
  notFound: () => pageLayout('404 Not Found', `
    <div class="error-container">
      <h1>Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <a href="/">Return to Home</a>
    </div>
  `, { showSidebar: false }),

  serverError: (error: Error) => pageLayout('500 Server Error', `
    <div class="error-container">
      <h1>Server Error</h1>
      <p>Something went wrong on our end.</p>
      <p><small>${error.message}</small></p>
      <a href="/">Return to Home</a>
    </div>
  `, { showSidebar: false }),
};

// Helper function for safe template rendering
export function renderTemplate(
  templateFn: () => string,
  errorHandler?: (error: Error) => void
): string {
  try {
    return templateFn();
  } catch (error) {
    console.error('Template rendering error:', error);
    if (errorHandler) {
      errorHandler(error as Error);
    }
    return errorTemplates.serverError(error as Error);
  }
}

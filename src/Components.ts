import { Logger } from './shared';
import { Env } from './types';
import { Context } from 'hono';

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

// Shared styles - keep only one declaration
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
    .auth-container {
      max-width: 400px;
      margin: 2rem auto;
      padding: 2rem;
      background: var(--secondary-bg);
      border-radius: 8px;
      box-shadow: 0 2px 4px var(--shadow-color);
    }
    .form-group {
      margin-bottom: 1rem;
    }
    .error-container {
      color: var(--error-color);
      margin-bottom: 1rem;
      padding: 0.5rem;
      border: 1px solid var(--error-color);
      border-radius: 4px;
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
      top: 40px;
      left: 0;
      height: calc(100% - 40px);
      display: block;
    }
    .sidebar-item {
      padding: 10px;
      cursor: pointer;
    }
    .sidebar-item:hover {
      background-color: #c0c0c0;
    }
    .content {
      margin-top: 50px;
      margin-left: 200px;
      transition: margin-left 0.3s;
      padding: 20px;
    }
    .content.collapsed {
      margin-left: 0;
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
    }
  </style>
`;

// Safe logging function that doesn't depend on external Logger
// Removed unused backuplog function

// Update the baseLayout template to include navigation
const baseLayout = (title: string, content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | RusstCorp</title>
  <link rel="stylesheet" href="/styles.css">
  ${sharedStyles}
  <script src="https://unpkg.com/htmx.org/dist/htmx.js"></script>
</head>
<body>
  <header class="action-bar">
    <div class="home-button" onclick="window.location.href='/'">Home</div>
    <div class="title">${title}</div>
    <div class="user-icon" onclick="toggleUserMenu()">
      <span>☰</span>
      <div class="menu" id="userMenu">
        <div class="menu-item" onclick="window.location.href='/profile'">Profile</div>
        <div class="menu-item" onclick="window.location.href='/settings'">Settings</div>
        <div class="menu-item" onclick="logout()">Logout</div>
      </div>
    </div>
  </header>

  <aside class="sidebar">
    <div class="sidebar-item" onclick="window.location.href='/dashboard'">Dashboard</div>
    <div class="sidebar-item" onclick="window.location.href='/notes'">Notes</div>
    <div class="sidebar-item" onclick="window.location.href='/memory'">Memory</div>
  </aside>

  <main class="content">
    ${content}
  </main>

  <script>
    // Navigation functions
    function toggleUserMenu() {
      const menu = document.getElementById('userMenu');
      menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }

    function logout() {
      fetch('/api/logout', { method: 'POST' })
        .then(() => window.location.href = '/login')
        .catch(err => console.error('Logout failed:', err));
    }

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      const menu = document.getElementById('userMenu');
      const userIcon = e.target.closest('.user-icon');
      if (!userIcon && menu.style.display === 'block') {
        menu.style.display = 'none';
      }
    });
  	document.getElementById('loginForm').addEventListener('htmx:afterRequest', function(event) {
    	const response = JSON.parse(event.detail.xhr.response);
    	if (response.success) {
      	window.location.href = response.redirect;
    	} else {
      	const errorContainer = document.getElementById('error-messages');
      	errorContainer.textContent = response.error;
      	errorContainer.style.display = 'block';
    	}
  	});

    // Add active state to current page
    document.addEventListener('DOMContentLoaded', () => {
      const path = window.location.pathname;
      document.querySelectorAll('.sidebar-item').forEach(item => {
        if (item.getAttribute('onclick').includes(path)) {
          item.classList.add('active');
        }
      });
    });
  </script>
</body>
</html>
`;

// Safe logging function
const log = (level: 'DEBUG' | 'INFO' | 'ERROR' | 'WARN', message: string, data?: any) => {
  try {
    Logger.log(level, message, data);
  } catch {
    console.log(`${level}: ${message}`, data);
  }
};

// Enhanced render utility with better error handling and logging
export function renderTemplate(templateFn: (() => string) | string): string {
  const renderStart = performance.now();
  const requestId = crypto.randomUUID();

  try {
    log('DEBUG', 'Template render started', {
      requestId,
      // Check if templateFn is a function before accessing name
      templateName: typeof templateFn === 'function' ? templateFn.name || 'anonymous' : 'static'
    });

    const html = typeof templateFn === 'function' ? templateFn() : templateFn;
    const renderTime = performance.now() - renderStart;

    log('DEBUG', 'Template render completed', {
      requestId,
      renderTimeMs: renderTime.toFixed(2)
    });

    return html;
  } catch (error) {
    const renderTime = performance.now() - renderStart;
    log('ERROR', 'Template render failed', {
      requestId,
      renderTimeMs: renderTime.toFixed(2),
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return errorTemplates.serverError(
      error instanceof Error ? error : new Error('Unknown render error')
    );
  }
}

// ===== MIDDLEWARE =====
export const errorHandler = async (err: Error, c: Context<{ Bindings: Env }>) => {
  Logger.log('ERROR', 'Application error', {
    error: err.message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method
  });
  if (err instanceof AppError) {
    return c.json({
      error: err.message,
      code: err.code,
      details: err.details
    }, { status: err.status });
  }
  return c.html(renderTemplate(() => errorTemplates.serverError(err)));
};

export const notFoundHandler = (c: Context) => {
  return c.html(renderTemplate(errorTemplates.notFound));
};

// ===== SECURITY UTILS =====
export function validatePasswordStrength(password: string): { valid: boolean; reason?: string } {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    return { valid: false, reason: 'Password must be at least 8 characters' };
  }
  if (!hasUpperCase || !hasLowerCase) {
    return { valid: false, reason: 'Password must contain both upper and lowercase letters' };
  }
  if (!hasNumbers) {
    return { valid: false, reason: 'Password must contain at least one number' };
  }
  if (!hasSpecialChar) {
    return { valid: false, reason: 'Password must contain at least one special character' };
  }
  return { valid: true };
}

// ===== RATE LIMITING =====
export class RateLimiter {
  private cache: Map<string, { count: number; resetTime: number }>;
  private readonly limit: number;
  private readonly windowMs: number;

  constructor(limit: number = 100, windowMs: number = 60000) {
    this.cache = new Map();
    this.limit = limit;
    this.windowMs = windowMs;
  }

  isRateLimited(key: string): boolean {
    const now = Date.now();
    const record = this.cache.get(key);

    if (!record) {
      this.cache.set(key, { count: 1, resetTime: now + this.windowMs });
      return false;
    }

    if (now > record.resetTime) {
      this.cache.set(key, { count: 1, resetTime: now + this.windowMs });
      return false;
    }

    record.count++;
    return record.count > this.limit;
  }
}

// ===== SESSION HANDLING =====
export class SessionDO {
  private state: DurableObjectState;
  private env: any;
  private static readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000;
  private static readonly RENEWAL_THRESHOLD = 60 * 60 * 1000;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);

      switch (url.pathname) {
        case '/save':
          return await this.handleSave(request);
        case '/get':
  // Removed unused env property
        case '/delete':
  // Removed unused RENEWAL_THRESHOLD property
        case '/renew':
          return await this.handleRenew();
        default:
          return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      Logger.log('ERROR', 'Session operation error', { error });
      return new Response('Internal Error', { status: 500 });
    }
  }

  private async handleSave(request: Request): Promise<Response> {
    try {
      const email = await request.text();
      const sessionData = {
        email,
        expires: Date.now() + SessionDO.SESSION_TIMEOUT,
        lastActivity: Date.now(),
        createdAt: Date.now()
      };

      await this.state.storage.put('session', sessionData);
      return new Response('OK');
    } catch (error) {
      Logger.log('ERROR', 'Session save error', { error });
      throw error;
    }
  }

  private async handleGet(): Promise<Response> {
    try {
      const session = await this.state.storage.get<{ expires: number }>('session');
      if (!session) {
        return new Response('Session not found', { status: 404 });
      }

      if (Date.now() > session.expires) {
        await this.handleDelete();
        return new Response('Session expired', { status: 401 });
      }

      await this.state.storage.put('session', {
        ...session,
        lastActivity: Date.now()
      });

      return new Response(JSON.stringify(session));
    } catch (error) {
      Logger.log('ERROR', 'Session get error', { error });
      throw error;
    }
  }

  private async handleRenew(): Promise<Response> {
    try {
      const session = await this.state.storage.get('session');
      if (!session) {
        return new Response('Session not found', { status: 404 });
      }

      const renewedSession = {
        ...session,
        expires: Date.now() + SessionDO.SESSION_TIMEOUT,
        lastActivity: Date.now()
      };

      await this.state.storage.put('session', renewedSession);
      return new Response('OK');
    } catch (error) {
      Logger.log('ERROR', 'Session renewal error', { error });
      throw error;
    }
  }

  private async handleDelete(): Promise<Response> {
    try {
      await this.state.storage.delete('session');
      return new Response('OK');
    } catch (error) {
      Logger.log('ERROR', 'Session delete error', { error });
      throw error;
    }
  }

  static createSessionId(namespace: DurableObjectNamespace, sessionToken: string): DurableObjectId {
    return namespace.idFromName(sessionToken);
  }
}

// ===== ERROR HANDLING =====
export class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public status: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Enhanced error templates with better error display
export const errorTemplates = {
  serverError: (error: Error) => baseLayout('Error', `
    <div class="error-container">
      <h1>Server Error</h1>
      <p>${error.message}</p>
      <p class="error-details">${error.stack || 'No stack trace available'}</p>
      <a href="/" class="button">Return Home</a>
    </div>
  `),
  notFound: () => baseLayout('Not Found', `
    <div class="error-container">
      <h1>Page Not Found</h1>
      <p>The requested page could not be found.</p>
      <a href="/" class="button">Return Home</a>
    </div>
  `)
};

// ===== ENVIRONMENT =====
export function validateEnv(env: Env): void {
  const required = ['DATABASE', 'USERS_KV', 'SESSIONS_DO', 'AI', 'VECTOR_INDEX'];
  const missing = required.filter(key => !(key in env));
  if (missing.length > 0) {
    throw new AppError(
      `Missing required environment variables: ${missing.join(', ')}`,
      'ENV_ERROR',
      500
    );
  }
}

// Login form component with proper HTMX attributes
const loginForm = `
<div class="auth-container">
  <h1>Login</h1>
  <div id="error-messages" class="error-container" style="display: none;"></div>
  <form id="loginForm" hx-post="/api/login" hx-target="#error-messages">
    <div class="form-group">
      <label for="email">Email</label>
      <input type="email" id="email" name="email" required>
    </div>
    <div class="form-group">
      <label for="password">Password</label>
      <input type="password" id="password" name="password" required>
    </div>
    <button type="submit">Login</button>
  </form>
  <p>Don't have an account? <a href="/signup">Sign up</a></p>
</div>
`;

// Home template component
const homeTemplate = `
<div class="home-container">
  <header class="action-bar">
    <div class="home-button">Home</div>
    <div class="title">RusstCorp</div>
    <div class="user-icon">User</div>
  </header>
  <aside class="sidebar">
    <div class="sidebar-item">Dashboard</div>
    <div class="sidebar-item">Settings</div>
    <div class="sidebar-item">Logout</div>
  </aside>
  <main class="content">
    <h1>Welcome to RusstCorp</h1>
    <p>Your one-stop solution for all your needs.</p>
  </main>
</div>
`;

// Enhanced templates object
export const templates = {
  login: () => {
    try {
      log('DEBUG', 'Rendering login template');
      const html = baseLayout('Login', loginForm);
      log('DEBUG', 'Login template rendered successfully');
      return html;
    } catch (error) {
      log('ERROR', 'Failed to render login template', { error });
      throw error;
    }
  },
  home: () => {
    try {
      log('DEBUG', 'Rendering home template');
      const html = baseLayout('Home', homeTemplate);
      log('DEBUG', 'Home template rendered successfully');
      return html;
    } catch (error) {
      log('ERROR', 'Failed to render home template', { error });
      throw error;
    }
  },
  // ...other templates...
  signup: () => {
    try {
      log('DEBUG', 'Rendering signup template');
      const html = baseLayout('Sign Up', `
        <div class="auth-container">
          <h1>Create Account</h1>
          <div id="error-messages" class="error-container" style="display: none;"></div>
          <form id="signupForm" hx-post="/api/signup" hx-target="#error-messages">
            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" id="email" name="email" required>
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <input type="password" id="password" name="password" required minlength="8">
              <small>Must be at least 8 characters with numbers and special characters</small>
            </div>
            <div class="form-group">
              <label for="confirm_password">Confirm Password</label>
              <input type="password" id="confirm_password" name="confirm_password" required>
            </div>
            <button type="submit">Sign Up</button>
          </form>
          <p>Already have an account? <a href="/login">Login</a></p>
        </div>
        <script>
          document.getElementById('signupForm').addEventListener('htmx:afterRequest', function(event) {
            const response = JSON.parse(event.detail.xhr.response);
            if (response.success) {
              window.location.href = '/dashboard';
            } else {
              const errorContainer = document.getElementById('error-messages');
              errorContainer.textContent = response.error;
              errorContainer.style.display = 'block';
            }
          });
        </script>
      `);
      log('DEBUG', 'Signup template rendered successfully');
      return html;
    } catch (error) {
      log('ERROR', 'Failed to render signup template', { error });
      throw error;
    }
  },

  dashboard: () => {
    try {
      log('DEBUG', 'Rendering dashboard template');
      const html = baseLayout('Dashboard', `
        <div class="dashboard-container">
          <div class="stats-grid">
            <div class="stat-card">
              <h3>Notes</h3>
              <div id="notes-count" hx-get="/api/stats/notes" hx-trigger="load">
                Loading...
              </div>
            </div>
            <div class="stat-card">
              <h3>Memory Folders</h3>
              <div id="folders-count" hx-get="/api/stats/folders" hx-trigger="load">
                Loading...
              </div>
            </div>
          </div>
          <div class="recent-activity">
            <h2>Recent Activity</h2>
            <div id="activity-feed"
                 hx-get="/api/activity"
                 hx-trigger="load, every 30s"
                 hx-target="this">
              Loading...
            </div>
          </div>
        </div>
      `);
      log('DEBUG', 'Dashboard template rendered successfully');
      return html;
    } catch (error) {
      log('ERROR', 'Failed to render dashboard template', { error });
      throw error;
    }
  },

  notes: (notes: any[]) => {
    try {
      log('DEBUG', 'Rendering notes template');
      const html = baseLayout('Notes', `
        <div class="notes-container">
          <div class="notes-header">
            <h2>My Notes</h2>
            <button onclick="window.location.href='/write'" class="primary">
              Create Note
            </button>
          </div>
          <div class="search-bar">
            <input type="search"
                   placeholder="Search notes..."
                   hx-get="/api/notes/search"
                   hx-trigger="keyup changed delay:500ms"
                   hx-target="#notes-list">
          </div>
          <div id="notes-list" class="notes-grid">
            ${notes.map(note => `
              <div class="note-card">
                <h3>${note.title || 'Untitled'}</h3>
                <p>${note.text.substring(0, 100)}...</p>
                <div class="note-meta">
                  <span>Created: ${new Date(note.createdAt).toLocaleDateString()}</span>
                  ${note.tags?.length ? `<span>Tags: ${note.tags.join(', ')}</span>` : ''}
                </div>
                <div class="note-actions">
                  <button onclick="editNote('${note.id}')">Edit</button>
                  <button onclick="deleteNote('${note.id}')" class="danger">Delete</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        <script>
          function editNote(id) {
            window.location.href = \`/notes/\${id}/edit\`;
          }

          async function deleteNote(id) {
            if (!confirm('Are you sure you want to delete this note?')) return;

            try {
              const response = await fetch(\`/api/notes/\${id}\`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
              });

              if (!response.ok) throw new Error('Failed to delete note');

              document.querySelector(\`[data-note-id="\${id}"]\`).remove();
              showToast('Note deleted successfully');
            } catch (error) {
              showToast(error.message, 'error');
            }
          }
        </script>
      `);
      log('DEBUG', 'Notes template rendered successfully');
      return html;
    } catch (error) {
      log('ERROR', 'Failed to render notes template', { error });
      throw error;
    }
  },

  memory: () => {
    try {
      log('DEBUG', 'Rendering memory template');
      const html = baseLayout('Memory', `
        <div class="memory-container">
          <div class="folders-header">
            <h2>Memory Folders</h2>
            <button onclick="createFolder()" class="primary">New Folder</button>
          </div>
          <div id="folders-grid"
               hx-get="/api/memory/folders"
               hx-trigger="load, folderChanged from:body">
            Loading folders...
          </div>
        </div>
        <script>
          async function createFolder() {
            const name = prompt('Enter folder name:');
            if (!name) return;

            try {
              const response = await fetch('/api/memory/folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
              });

              if (!response.ok) throw new Error('Failed to create folder');

              htmx.trigger('#folders-grid', 'folderChanged');
              showToast('Folder created successfully');
            } catch (error) {
              showToast(error.message, 'error');
            }
          }
        </script>
      `);
      log('DEBUG', 'Memory template rendered successfully');
      return html;
    } catch (error) {
      log('ERROR', 'Failed to render memory template', { error });
      throw error;
    }
  },

  settings: () => {
    try {
      log('DEBUG', 'Rendering settings template');
      const html = baseLayout('Settings', `
        <div class="settings-container">
          <h2>Account Settings</h2>
          <form id="settings-form" hx-post="/api/settings" hx-target="#settings-message">
            <div class="form-group">
              <label for="current_password">Current Password</label>
              <input type="password" id="current_password" name="current_password">
            </div>
            <div class="form-group">
              <label for="new_password">New Password</label>
              <input type="password" id="new_password" name="new_password">
            </div>
            <div class="form-group">
              <label for="theme">Theme</label>
              <select id="theme" name="theme">
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            <div id="settings-message"></div>
            <button type="submit">Save Changes</button>
          </form>
        </div>
      `);
      log('DEBUG', 'Settings template rendered successfully');
      return html;
    } catch (error) {
      log('ERROR', 'Failed to render settings template', { error });
      throw error;
    }
  },

  profile: (userData: any) => {
    try {
      log('DEBUG', 'Rendering profile template');
      const html = baseLayout('Profile', `
        <div class="profile-container">
          <h2>Profile</h2>
          <div class="profile-info">
            <div class="avatar-section">
              <img src="${userData.avatarUrl || '/default-avatar.png'}" alt="Profile picture">
              <button onclick="updateAvatar()">Change Picture</button>
            </div>
            <form id="profile-form" hx-post="/api/profile" hx-target="#profile-message">
              <div class="form-group">
                <label for="displayName">Display Name</label>
                <input type="text" id="displayName" name="displayName"
                       value="${userData.displayName || ''}" required>
              </div>
              <div class="form-group">
                <label for="bio">Bio</label>
                <textarea id="bio" name="bio">${userData.bio || ''}</textarea>
              </div>
              <div id="profile-message"></div>
              <button type="submit">Update Profile</button>
            </form>
          </div>
        </div>
        <script>
          async function updateAvatar() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async () => {
              const file = input.files?.[0];
              if (!file) return;

              const formData = new FormData();
              formData.append('avatar', file);

              try {
                const response = await fetch('/api/profile/avatar', {
                  method: 'POST',
                  body: formData
                });

                if (!response.ok) throw new Error('Failed to update avatar');

                location.reload();
              } catch (error) {
                showToast(error.message, 'error');
              }
            };
            input.click();
          }
        </script>
      `);
      log('DEBUG', 'Profile template rendered successfully');
      return html;
    } catch (error) {
      log('ERROR', 'Failed to render profile template', { error });
      throw error;
    }
  }
};

import { Env } from './types';
import { DurableObjectState } from '@cloudflare/workers-types';
import { Context } from 'hono';
import { validateEmail, hashPassword, generateSecureKey } from './shared';

// Helper function for sending verification emails
async function sendVerificationEmail(_env: Env, email: string, token: string): Promise<void> {
  // Implementation of email sending logic
  // This is a placeholder that should be replaced with actual email sending logic
  console.log('Sending verification email to:', email, 'with token:', token);
}

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

import { Hono } from 'hono';

const publicRoutes = new Hono<{ Bindings: Env }>();

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
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${level}: ${message}`, data || '');
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
  log('ERROR', 'Application error', {
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
interface SessionData {
  email: string;
  deviceInfo: { userAgent: string; ip: string; timestamp: number };
  expires: number;
  lastActivity: number;
  createdAt: number;
  version: number;
}

export class SessionDO {
  private static readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private static readonly RENEWAL_THRESHOLD = 60 * 60 * 1000;
  private static readonly MAX_SESSIONS_PER_USER = 5;
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      switch (url.pathname) {
        case '/save':
          return await this.handleSave(request);
        case '/get':
          return await this.handleGet();
        case '/delete':
          return await this.handleDelete();
        case '/renew':
          return await this.handleRenew();
        default:
          return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      log('ERROR', 'Session operation error', { error });
      return new Response('Internal Error', { status: 500 });
    }
  }

  private async handleDelete(): Promise<Response> {
    try {
      await this.state.storage.delete('session');
      return new Response('OK');
    } catch (error) {
      log('ERROR', 'Session delete error', { error });
      return new Response('Internal Error', { status: 500 });
    }
  }

  async handleSave(request: Request): Promise<Response> {
    try {
      const data = await request.json() as {
        email: string;
        deviceInfo: { userAgent: string; ip: string; timestamp: number };
        rememberMe: boolean
      };
      const { email, deviceInfo, rememberMe } = data;
      if (await this.getUserSessions(email).then(sessions => sessions.length >= SessionDO.MAX_SESSIONS_PER_USER)) {
        // Remove oldest session
        await this.removeOldestSession(email);
      }

      const sessionData = {
        email,
        deviceInfo,
        expires: Date.now() + (rememberMe ? SessionDO.SESSION_TIMEOUT * 30 : SessionDO.SESSION_TIMEOUT),
        lastActivity: Date.now(),
        createdAt: Date.now(),
        version: 1
      };

      await this.state.storage.put('session', sessionData);
      return new Response('OK');
    } catch (error) {
      log('ERROR', 'Session save error', { error });
      return new Response('Internal Error', { status: 500 });
    }
  }

  async handleGet(): Promise<Response> {
    try {
      const session = await this.state.storage.get<SessionData>('session');
      if (!session) {
        return new Response('Session not found', { status: 404 });
      }

      if (Date.now() > session.expires) {
        await this.handleDelete();
        return new Response('Session expired', { status: 401 });
      }

      // Auto-renew session if within threshold
      if (Date.now() - session.lastActivity > SessionDO.RENEWAL_THRESHOLD) {
        await this.handleRenew();
      }

      await this.state.storage.put('session', {
        ...session,
        lastActivity: Date.now()
      });

      return new Response(JSON.stringify(session));
    } catch (error) {
      log('ERROR', 'Session get error', { error });
      return new Response('Internal Error', { status: 500 });
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
      log('ERROR', 'Session renewal error', { error });
      return new Response('Internal Error', { status: 500 });
    }
  }
  private async getUserSessions(_email: string): Promise<SessionData[]> {
    // Temporary implementation returning empty array
    return [];
  }

  private async removeOldestSession(email: string): Promise<void> {
    // Temporary implementation doing nothing
    console.log('Removing oldest session for:', email);
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
      <input type="email" id="email" name="email" required
             pattern="[^@]+@[^@]+\.[^@]+"
             title="Please enter a valid email">
    </div>
    <div class="form-group">
      <label for="password">Password</label>
      <input type="password" id="password" name="password" required minlength="8">
      <div class="password-strength"></div>
    </div>
    <div class="form-options">
      <label>
        <input type="checkbox" name="remember_me"> Remember me
      </label>
      <a href="/forgot-password" class="forgot-password">Forgot password?</a>
    </div>
    <button type="submit" id="submitBtn">Login</button>
    <div class="loading-indicator" style="display: none;">Signing in...</div>
  </form>
  <p>Don't have an account? <a href="/signup">Sign up</a></p>
  <script>
    const form = document.getElementById('loginForm');
    const submitBtn = document.getElementById('submitBtn');
    const loading = document.querySelector('.loading-indicator');

    form.addEventListener('submit', (e) => {
      if (!form.checkValidity()) {
        e.preventDefault();
        return;
      }
    });

    form.addEventListener('htmx:beforeRequest', () => {
      submitBtn.disabled = true;
      loading.style.display = 'block';
    });

    form.addEventListener('htmx:afterRequest', function(event) {
      submitBtn.disabled = false;
      loading.style.display = 'none';

      try {
        const response = JSON.parse(event.detail.xhr.response);
        if (response.success) {
          window.location.href = response.redirect;
        } else {
          const errorContainer = document.getElementById('error-messages');
          errorContainer.textContent = response.error || 'Login failed';
          errorContainer.style.display = 'block';
        }
      } catch (error) {
        console.error('Login error:', error);
        const errorContainer = document.getElementById('error-messages');
        errorContainer.textContent = 'An unexpected error occurred';
        errorContainer.style.display = 'block';
      }
    });
  </script>
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
    } catch (error: any) {
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
    } catch (error: any) {
      log('ERROR', 'Failed to render home template', { error });
      throw error;
    }
  },
  signup: () => {
    try {
      const html = baseLayout('Sign Up', `
        <div class="auth-container">
          <h1>Create Account</h1>
          <div id="error-messages" class="error-container" style="display: none;"></div>
          <form id="signupForm" hx-post="/api/signup" hx-target="#error-messages">
            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" id="email" name="email" required
                     pattern="[^@]+@[^@]+\.[^@]+" title="Please enter a valid email">
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <input type="password" id="password" name="password" required minlength="8">
              <div class="password-strength"></div>
              <small>Must have uppercase, lowercase, numbers, and special characters</small>
            </div>
            <div class="form-group">
              <label for="confirm_password">Confirm Password</label>
              <input type="password" id="confirm_password" name="confirm_password" required>
            </div>
            <button type="submit" id="submitBtn">Sign Up</button>
            <div class="loading-indicator" style="display: none;">Creating account...</div>
          </form>
          <p>Already have an account? <a href="/login">Login</a></p>
          <script>
            const form = document.getElementById('signupForm');
            const passwordInput = document.getElementById('password');
            const confirmInput = document.getElementById('confirm_password');
            const submitBtn = document.getElementById('submitBtn');
            const loading = document.querySelector('.loading-indicator');

            passwordInput.addEventListener('input', function() {
              const strength = validatePasswordStrength(this.value);
              const indicator = document.querySelector('.password-strength');
              indicator.textContent = strength.reason || 'Password strength: Good';
              indicator.className = 'password-strength ' + (strength.valid ? 'valid' : 'invalid');
            });

            confirmInput.addEventListener('input', function() {
              if (this.value !== passwordInput.value) {
                this.setCustomValidity('Passwords must match');
              } else {
                this.setCustomValidity('');
              }
            });

            form.addEventListener('htmx:beforeRequest', () => {
              submitBtn.disabled = true;
              loading.style.display = 'block';
            });

            form.addEventListener('htmx:afterRequest', function(event) {
              submitBtn.disabled = false;
              loading.style.display = 'none';

              try {
                const response = JSON.parse(event.detail.xhr.response);
                if (response.success) {
                  window.location.href = '/dashboard';
                } else {
                  const errorContainer = document.getElementById('error-messages');
                  errorContainer.textContent = response.error;
                  errorContainer.style.display = 'block';
                }
              } catch (error) {
                console.error('Signup error:', error);
                const errorContainer = document.getElementById('error-messages');
                errorContainer.textContent = 'An unexpected error occurred';
                errorContainer.style.display = 'block';
              }
            });
          </script>
        </div>
      `);
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
          <form id="profile-form" hx-post="/api/profile" hx-target="#profile-message">
            <div class="form-group">
              <label for="displayName">Display Name</label>
              <input type="text" id="displayName" name="displayName" value="${userData.displayName || ''}" required>
            </div>
            <div class="form-group">
              <label for="bio">Bio</label>
              <textarea id="bio" name="bio">${userData.bio || ''}</textarea>
            </div>
            <div id="profile-message"></div>
            <button type="submit">Update Profile</button>
          </form>
          <div class="avatar-section">
            <button type="button" onclick="updateAvatar()">Update Avatar</button>
          </div>
        </div>
        <script type="text/javascript">
          function updateAvatar() {
            var input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = function() {
              var file = input.files ? input.files[0] : null;
              if (!file) return;

              var formData = new FormData();
              formData.append('avatar', file);

              fetch('/api/profile/avatar', {
                method: 'POST',
                body: formData
              })
              .then(function(response) {
                if (!response.ok) throw new Error('Failed to update avatar');
                window.location.reload();
              })
              .catch(function(err) {
                console.error('Avatar update failed:', err);
                alert('Failed to update avatar: ' + err.message);
              });
            };
            input.click();
          }
        </script>
      `);
      log('DEBUG', 'Profile template rendered successfully');
      return html;
    } catch (error) {
      const err = error as Error;
      log('ERROR', 'Failed to render profile template', { error: err });
      throw err;
    }
  }
};

// API Routes
publicRoutes.post('/api/signup', async (c: Context<{ Bindings: Env }>) => {
  try {
    const { email, password, confirm_password } = await c.req.parseBody() as { email: string, password: string, confirm_password: string };

    // Input validation
    if (!email || !password) {
      return c.json({ error: "Missing email or password" }, 400);
    }

    if (password !== confirm_password) {
      return c.json({ error: "Passwords do not match" }, 400);
    }

if (!validateEmail(email)) {
  return c.json({ error: "Invalid email format" }, 400);
}

// Check password strength
const strengthCheck = validatePasswordStrength(password);
if (!strengthCheck.valid) {
  return c.json({ error: strengthCheck.reason }, 400);
    }

    // Check for existing user
    const existing = await c.env.USERS_KV.get(email);
    if (existing) {
      return c.json({ error: "Email already registered" }, 400);
    }

    // Create user
    const hashedPassword = await hashPassword(password);
    const user = {
      email,
      password: hashedPassword,
      created_at: new Date().toISOString(),
      status: 'pending_verification',
      login_attempts: 0,
      last_login: null
    };

    // Save user
    await c.env.USERS_KV.put(email, JSON.stringify(user));

    // Create verification token
    const verificationToken = generateSecureKey(32);
    await c.env.USERS_KV.put(`verify_${email}`, verificationToken, {
      expirationTtl: 60 * 60 // 1 hour
    });

    // Send verification email
    await sendVerificationEmail(c.env, email, verificationToken);

    return c.json({
      success: true,
      message: "Account created. Please check your email to verify your account."
    });

  } catch (err) {
    log('ERROR', 'Signup failed', { error: err });
    return c.json({ error: 'Failed to create account' }, 500);
  }
});

// Import required dependencies at the top of the file instead
import { setCookie } from 'hono/cookie';

// Basic password comparison function since we can't import from auth
async function comparePasswords(password: string, hashedPassword: string): Promise<boolean> {
  // Implement your password comparison logic here
  // This is a placeholder - replace with actual secure comparison
  return password === hashedPassword; // Note: This is NOT secure, implement proper comparison
}

// Rate limiter middleware
const createRateLimiter = (limiter: RateLimiter) => {
  return async (c: Context<{ Bindings: Env }>, next: Function) => {
    const ip = c.req.header('cf-connecting-ip') || '';
    if (limiter.isRateLimited(ip)) {
      return c.json({ error: 'Too many requests' }, 429);
    }
    await next();
  };
};

// Login route handler
publicRoutes.post('/api/login', createRateLimiter(new RateLimiter(10, 60000)), async (c: Context<{ Bindings: Env }>) => {
  try {
    const formData = await c.req.parseBody();
    const email = String(formData.email || '');
    const password = String(formData.password || '');
    const rememberMe = Boolean(formData.remember_me);

    // Input validation
    if (!email || !password || !validateEmail(email)) {
      return c.json({ error: 'Invalid credentials' }, 400);
    }

    // Get user data
    const userData = await c.env.USERS_KV.get(email as string);
    if (!userData) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const user = JSON.parse(userData);

    // Check account status
    if (user.status === 'locked') {
      return c.json({ error: 'Account is locked. Please contact support.' }, 403);
    }

    // Check login attempts
    if (user.loginAttempts >= 5) {
      user.status = 'locked';
      await c.env.USERS_KV.put(email as string, JSON.stringify(user));
      return c.json({ error: 'Too many failed attempts. Account locked.' }, 403);
    }

    // Verify password
    const isValidPassword = await comparePasswords(password, user.password);
    if (!isValidPassword) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      await c.env.USERS_KV.put(email as string, JSON.stringify(user));
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.lastLoginAt = new Date().toISOString();
    await c.env.USERS_KV.put(email as string, JSON.stringify(user));

    // Create session
    const sessionToken = generateSecureKey(32);
    const deviceInfo = {
      userAgent: c.req.header('user-agent'),
      ip: c.req.header('cf-connecting-ip'),
      timestamp: Date.now()
    };

    const sessionId = SessionDO.createSessionId(c.env.SESSIONS_DO, sessionToken);
    const sessionDO = c.env.SESSIONS_DO.get(sessionId);

    const saveResponse = await sessionDO.fetch(new Request('https://dummy/save', {
      method: 'POST',
      body: JSON.stringify({ email, deviceInfo, rememberMe })
    }));

    if (!saveResponse.ok) {
      throw new Error('Failed to create session');
    }

    // Set cookie
    setCookie(c, 'session', sessionToken, {
      httpOnly: true,
      secure: true,
      path: '/',
      sameSite: 'Strict',
      maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24
    });

    return c.json({ success: true, redirect: '/dashboard' });
  } catch (error) {
    log('ERROR', 'Login failed', { error });
    return c.json({ error: 'Login failed' }, 500);
  }
});

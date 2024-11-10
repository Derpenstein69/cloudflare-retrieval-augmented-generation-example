import { api } from './api-service';
import { state } from './state';
import { deleteCookie } from 'hono/cookie';
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
import { Logger } from './shared';

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
const backuplog = (level: 'DEBUG' | 'INFO' | 'ERROR' | 'WARN', message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({ timestamp, level, message, data }));
};

// Base layout template
const baseLayout = (title: string, content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | RusstCorp</title>
  <link rel="stylesheet" href="/styles.css">
  ${sharedStyles}
</head>
<body>
  <div class="container">
    ${content}
  </div>
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
export function renderTemplate(template: () => string): string {
  const renderStart = performance.now();
  const requestId = crypto.randomUUID();

  try {
    log('DEBUG', 'Template render started', {
      requestId,
      templateName: template.name || 'anonymous'
    });

    const html = template();
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
    }, err.status);
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
          return await this.handleGet();
        case '/delete':
          return await this.handleDelete();
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
      const session = await this.state.storage.get('session');
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

// Login form component
const loginForm = `
<div class="auth-form">
  <h1>Login</h1>
  <form id="loginForm" hx-post="/login" hx-swap="outerHTML">
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
  <p><a href="/signup">Need an account? Sign up</a></p>
</div>
`;

// Enhanced templates object
export const templates = {
  login: () => {
    try {
      Logger.log('DEBUG', 'Rendering login template');
      const html = baseLayout('Login', loginForm);
      Logger.log('DEBUG', 'Login template rendered successfully');
      return html;
    } catch (error) {
      Logger.log('ERROR', 'Failed to render login template', { error });
      throw error;
    }
  }
}

import type { Context } from 'hono';
import type { Env } from './types';
import { getCookie } from 'hono/cookie';

// ===== UTILITY FUNCTIONS =====
export async function hashPassword(password: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)));
  } catch (error) {
    console.error('Password hashing error:', error);
    throw new Error('Failed to hash password');
  }
}

export function generateSecureKey(length: number = 32): string {
  try {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (error) {
    console.error('Key generation error:', error);
    throw new Error('Failed to generate secure key');
  }
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function safeExecute<T>(
  operation: () => Promise<T>,
  errorMessage: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    throw new Error(errorMessage);
  }
}

// ===== SESSION HANDLING =====
export class SessionDO {
  private state: DurableObjectState;
  private env: any;
  private static readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  // ...existing SessionDO methods...

  static createSessionId(namespace: DurableObjectNamespace, sessionToken: string): DurableObjectId {
    return namespace.idFromName(sessionToken);
  }
}

// ===== MIDDLEWARE =====
export const errorHandler = async (err: Error, c: Context<{ Bindings: Env }>) => {
  console.error('Application error:', err);
  return c.json({ error: 'Internal server error' }, 500);
};

export const notFoundHandler = (c: Context) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>404 Not Found - RusstCorp</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/water.css@2/out/water.css">
      </head>
      <body>
        <h1>Page Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <a href="/">Return to Home</a>
      </body>
    </html>
  `, 404);
};

export const authMiddleware = async (c: Context<{ Bindings: Env }>, next: () => Promise<void>) => {
  try {
    const sessionToken = getCookie(c, 'session');
    if (!sessionToken) throw new Error('No session token');

    const sessionId = SessionDO.createSessionId(c.env.SESSIONS_DO, sessionToken);
    const sessionDO = c.env.SESSIONS_DO.get(sessionId);
    const response = await sessionDO.fetch(new Request('https://dummy/get'));

    if (!response.ok) throw new Error('Invalid session');

    const userEmail = await response.text();
    if (!userEmail) throw new Error('No user email');

    c.set('userEmail', userEmail);
    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.redirect('/login');
  }
};

// ===== LAYOUTS =====
export const baseLayout = (title: string, content: string, options: { showNav?: boolean } = {}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title} | RusstCorp</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/water.css@2/out/water.css">
  ${sharedStyles}
</head>
<body>
  ${options.showNav ? navigationBar() : simpleHeader()}
  ${content}
  ${themeScript}
  ${options.showNav ? commonScripts : ''}
</body>
</html>
`;

const navigationBar = () => `
  // ...existing navigationBar code...
`;

const simpleHeader = () => `
  // ...existing simpleHeader code...
`;

// ===== STYLES =====
export const sharedStyles = `
  <style>
    :root {
      --primary-color: white;
      --secondary-color: #d3d3d3;
      --text-color: black;
    }
    // ...existing styles...
  </style>
`;

// ===== SCRIPTS =====
export const themeScript = `
  <script>
    // ...existing theme script...
  </script>
`;

export const commonScripts = `
  <script>
    function toggleMenu() {
      const menu = document.getElementById('user-menu');
      menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }

    function toggleSidebar() {
      const sidebar = document.getElementById('sidebar');
      const content = document.getElementById('content');
      sidebar.style.display = sidebar.style.display === 'none' ? 'block' : 'none';
      content.classList.toggle('collapsed');
    }

    function goHome() {
      window.location.href = '/';
    }

    function loadContent(path) {
      window.location.href = path;
    }

    async function handleLogout() {
      try {
        const response = await fetch('/logout', { method: 'POST' });
        if (response.ok) {
          window.location.href = '/login';
        } else {
          throw new Error('Logout failed');
        }
      } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to logout. Please try again.');
      }
    }
  </script>
`;

// ===== ENVIRONMENT =====
export function validateEnv(env: Env) {
  const required = ['DATABASE', 'USERS_KV', 'SESSIONS_DO', 'AI', 'VECTOR_INDEX'];
  const missing = required.filter(key => !(key in env));
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

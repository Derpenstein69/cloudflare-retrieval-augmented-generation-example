import type { Context } from 'hono';
import type { Env } from './types';
import { getCookie } from 'hono/cookie';
import { errorTemplates, renderTemplate } from './Components';

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
        default:
          return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      console.error('Session operation error:', error);
      return new Response('Internal Error', { status: 500 });
    }
  }

  private async handleSave(request: Request): Promise<Response> {
    try {
      const email = await request.text();
      const expires = Date.now() + SessionDO.SESSION_TIMEOUT;

      await Promise.all([
        this.state.storage.put('email', email),
        this.state.storage.put('expires', expires)
      ]);

      return new Response('OK');
    } catch (error) {
      console.error('Session save error:', error);
      throw error;
    }
  }

  private async handleGet(): Promise<Response> {
    try {
      const [email, expires] = await Promise.all([
        this.state.storage.get('email'),
        this.state.storage.get('expires')
      ]);

      if (!email || !expires) {
        return new Response('Session not found', { status: 404 });
      }

      if (Date.now() > expires) {
        await this.handleDelete();
        return new Response('Session expired', { status: 401 });
      }

      // Refresh session timeout on successful get
      await this.state.storage.put('expires', Date.now() + SessionDO.SESSION_TIMEOUT);
      return new Response(email.toString());
    } catch (error) {
      console.error('Session get error:', error);
      throw error;
    }
  }

  private async handleDelete(): Promise<Response> {
    try {
      await this.state.storage.deleteAll();
      return new Response('OK');
    } catch (error) {
      console.error('Session delete error:', error);
      throw error;
    }
  }

  static createSessionId(namespace: DurableObjectNamespace, sessionToken: string): DurableObjectId {
    return namespace.idFromName(sessionToken);
  }
}

// ===== MIDDLEWARE =====
export const errorHandler = async (err: Error, c: Context<{ Bindings: Env }>) => {
  console.error('Application error:', err);
  return c.html(renderTemplate(() => errorTemplates.serverError(err)));
};

export const notFoundHandler = (c: Context) => {
  return c.html(renderTemplate(errorTemplates.notFound));
};

export const authMiddleware = async (c: Context<{ Bindings: Env }>, next: () => Promise<void>) => {
  try {
    const path = new URL(c.req.url).pathname;
    console.log(`Processing request for path: ${path}`);

    if (path === '/login' || path === '/signup') {
      console.log('Skipping auth check for public route');
      return next();
    }

    const sessionToken = getCookie(c, 'session');
    if (!sessionToken) {
      console.log('No session token found, redirecting to login');
      return c.redirect('/login');
    }

    const sessionId = SessionDO.createSessionId(c.env.SESSIONS_DO, sessionToken);
    const sessionDO = c.env.SESSIONS_DO.get(sessionId);

    console.log('Validating session...');
    const response = await sessionDO.fetch(new Request('https://dummy/get'));

    if (!response.ok) {
      console.log('Invalid session, clearing cookie and redirecting');
      deleteCookie(c, 'session', { path: '/' });
      return c.redirect('/login');
    }

    const userEmail = await response.text();
    if (!userEmail) {
      console.log('No user email in session, clearing cookie and redirecting');
      deleteCookie(c, 'session', { path: '/' });
      return c.redirect('/login');
    }

    console.log('Auth successful, setting user context');
    c.set('userEmail', userEmail);
    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.redirect('/login');
  }
};

// ===== ENVIRONMENT =====
export function validateEnv(env: Env) {
  const required = ['DATABASE', 'USERS_KV', 'SESSIONS_DO', 'AI', 'VECTOR_INDEX'];
  const missing = required.filter(key => !(key in env));
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

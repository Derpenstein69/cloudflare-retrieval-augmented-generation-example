import type { Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { Env } from './types';
import { errorTemplates, renderTemplate } from './Components';

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
      console.error('Session operation error:', error);
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
      console.error('Session save error:', error);
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
      console.error('Session get error:', error);
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
      console.error('Session renewal error:', error);
      throw error;
    }
  }

  private async handleDelete(): Promise<Response> {
    try {
      await this.state.storage.delete('session');
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

export const safeExecute = async <T>(
  operation: () => Promise<T>,
  errorMessage: string
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    throw new AppError(errorMessage, 'OPERATION_FAILED');
  }
};

// ===== MIDDLEWARE =====
export const errorHandler = async (err: Error, c: Context<{ Bindings: Env }>) => {
  console.error('Application error:', err);
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

export const authMiddleware = async (c: Context<{ Bindings: Env }>, next: () => Promise<void>) => {
  try {
    const path = new URL(c.req.url).pathname;
    if (['/login', '/signup', '/public'].some(p => path.startsWith(p))) {
      return next();
    }

    const sessionToken = getCookie(c, 'session');
    if (!sessionToken) {
      throw new AppError('No session token', 'AUTH_REQUIRED', 401);
    }

    const sessionId = SessionDO.createSessionId(c.env.SESSIONS_DO, sessionToken);
    const sessionDO = c.env.SESSIONS_DO.get(sessionId);
    const response = await sessionDO.fetch(new Request('https://dummy/get'));

    if (!response.ok) {
      deleteCookie(c, 'session', { path: '/' });
      throw new AppError('Invalid session', 'AUTH_FAILED', 401);
    }

    const session = await response.json();
    c.set('userEmail', session.email);
    c.set('session', session);
    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    deleteCookie(c, 'session', { path: '/' });
    if (error instanceof AppError) {
      return c.redirect('/login');
    }
    return c.redirect('/login');
  }
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

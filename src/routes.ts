import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { rateLimit, validate, sanitize } from './middleware';
import {
  validateEmail,
  hashPassword,
  generateSecureKey,
  SessionDO,
  // validatePasswordStrength
} from './shared';
import { templates, renderTemplate, errorTemplates } from './Components';
import type { Env } from './types';
import { Logger } from './shared';

// Enhanced error mapping

// Session configuration
const SESSION_CONFIG = {
  maxAge: 60 * 60 * 24, // 24 hours
  renewalThreshold: 60 * 60, // 1 hour
};

// Enhanced environment validation
export function validateEnv(env: Env): void {
  const required = ['DATABASE', 'USERS_KV', 'SESSIONS_DO', 'AI', 'VECTOR_INDEX', 'SMTP_CONFIG'];
  const missing = required.filter(key => !(key in env));
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Enhanced auth middleware with session renewal
export const authMiddleware = async (c: any, next: () => Promise<any>) => {
  try {
    const sessionToken = getCookie(c, 'session');
    if (!sessionToken) throw new Error('No session token');

    const sessionId = SessionDO.createSessionId(c.env.SESSIONS_DO, sessionToken);
    const sessionDO = c.env.SESSIONS_DO.get(sessionId);
    const response = await sessionDO.fetch(new Request('https://dummy/get'));

    if (!response.ok) throw new Error('Invalid session');

    const session = await response.json();
    if (Date.now() - session.lastActivity > SESSION_CONFIG.maxAge * 1000) {
      throw new Error('Session expired');
    }

    // Renew session if needed
    if (Date.now() - session.lastActivity > SESSION_CONFIG.renewalThreshold * 1000) {
      await renewSession(c, sessionToken, session.email);
    }

    c.set('userEmail', session.email);
    c.set('user', session.user);
    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    deleteCookie(c, 'session', { path: '/' });
    return c.redirect('/login');
  }
};

// Session renewal helper
async function renewSession(c: any, token: string, email: string): Promise<void> {
  const sessionId = SessionDO.createSessionId(c.env.SESSIONS_DO, token);
  const sessionDO = c.env.SESSIONS_DO.get(sessionId);
  await sessionDO.fetch(new Request('https://dummy/update', {
    method: 'POST',
    body: JSON.stringify({ email, lastActivity: Date.now() })
  }));
}

// Error handling middleware

function errorHandler(error: Error, context: string): Response {
  console.error(`Error during ${context}:`, error);
  return new Response('Internal Server Error', { status: 500 });
}

const routes = new Hono<{ Bindings: Env }>();

// Middleware order is important - most general first
routes.use('*', async (c, next) => {
  Logger.log('INFO', `Request: ${c.req.method} ${c.req.path}`, {
    requestId: crypto.randomUUID()
  });
  await next();
});

// Rate limiting for API routes
routes.use('/api/*', rateLimit());
routes.use('/api/*', sanitize());

// Public routes first
routes.get('/', async (c) => {
  const sessionToken = getCookie(c, 'session');
  if (sessionToken) {
    return c.redirect('/dashboard');
  }
  return c.html(renderTemplate(() => templates.home()));
});

// Public auth routes - before protected routes
routes.post('/api/login', async (c) => {
  try {
    const { email, password } = await c.req.parseBody();
    if (!email || !password || !validateEmail(email)) {
      return c.json({ error: 'Invalid credentials' }, 400);
    }

    const userData = await c.env.USERS_KV.get(email);
    if (!userData) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const user = JSON.parse(userData);
    if (!validatePassword(password, user.password)) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Generate and store session
    const sessionToken = generateSecureKey(32);
    const sessionDO = c.env.SESSIONS_DO.get(
      SessionDO.createSessionId(c.env.SESSIONS_DO, sessionToken)
    );

    const saveResponse = await sessionDO.fetch(new Request('https://dummy/save', {
      method: 'POST',
      body: email
    }));

    if (!saveResponse.ok) {
      throw new Error('Failed to create session');
    }

    setCookie(c, 'session', sessionToken, {
      httpOnly: true,
      secure: true,
      path: '/',
      sameSite: 'Strict',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return c.json({ success: true, redirect: '/dashboard' });
  } catch (error) {
    Logger.log('ERROR', 'Login failed', { error });
    return c.json({ error: 'Login failed' }, 500);
  }
});

// Protected routes with auth middleware
const protectedRoutes = new Hono<{ Bindings: Env }>();
protectedRoutes.use('*', authMiddleware);

protectedRoutes.get('/dashboard', (c) => {
  try {
    return c.html(renderTemplate(() => templates.dashboard()));
  } catch (error) {
    Logger.log('ERROR', 'Dashboard render failed', { error });
    return c.html(renderTemplate(() => errorTemplates.serverError(error as Error)));
  }
});

protectedRoutes.get('/notes', async (c) => {
  const userEmail = c.get('userEmail');
  try {
    const { results } = await c.env.DATABASE.prepare(
      'SELECT * FROM notes WHERE userEmail = ? ORDER BY created_at DESC'
    ).bind(userEmail).all();
    return c.html(renderTemplate(() => templates.notes(results)));
  } catch (error) {
    Logger.log('ERROR', 'Notes page render failed', { error });
    return c.html(renderTemplate(() => errorTemplates.serverError(error as Error)));
  }
});

protectedRoutes.get('/memory', async (c) => {
  try {
    return c.html(renderTemplate(() => templates.memory()));
  } catch (error) {
    Logger.log('ERROR', 'Memory page render failed', { error });
    return c.html(renderTemplate(() => errorTemplates.serverError(error as Error)));
  }
});

protectedRoutes.get('/settings', async (c) => {
  try {
    return c.html(renderTemplate(() => templates.settings()));
  } catch (error) {
    Logger.log('ERROR', 'Settings page render failed', { error });
    return c.html(renderTemplate(() => errorTemplates.serverError(error as Error)));
  }
});

protectedRoutes.get('/profile', async (c) => {
  try {
    const userEmail = c.get('userEmail');
    const userData = await c.env.USERS_KV.get(userEmail);
    if (!userData) {
      throw new Error('User not found');
    }
    return c.html(renderTemplate(() => templates.profile(JSON.parse(userData))));
  } catch (error) {
    Logger.log('ERROR', 'Profile page render failed', { error });
    return c.html(renderTemplate(() => errorTemplates.serverError(error as Error)));
  }
});

// Mount protected routes
routes.route('/', protectedRoutes);

// API routes
routes.post('/api/signup', async (c) => {
  if (c.req.method !== 'POST') {
    return c.text('Method not allowed', 405);
  }
  try {
    const formData = await c.req.parseBody();
    const { email, password, confirm_password } = formData;

    if (!email || !password) {
      return c.json({ error: "Missing email or password" }, 400);
    }

    if (password !== confirm_password) {
      return c.json({ error: "Passwords do not match" }, 400);
    }

    if (typeof password === 'string' && password.length < 8) {
      return c.json({ error: "Password must be at least 8 characters" }, 400);
    }

    const existing = await c.env.USERS_KV.get(email as string);
    if (existing) {
      return c.json({ error: "Email already registered" }, 400);
    }

    const hashedPassword = await hashPassword(password as string);
    const user = { email, password: hashedPassword };
    await c.env.USERS_KV.put(email as string, JSON.stringify(user));

    const sessionToken = generateSecureKey(32);
    const sessionId = SessionDO.createSessionId(c.env.SESSIONS_DO, sessionToken);
    const sessionDO = c.env.SESSIONS_DO.get(sessionId);
    await sessionDO.fetch(new Request('https://dummy/save', {
      method: 'POST',
      body: email as string
    }));

    setCookie(c, 'session', sessionToken, {
      httpOnly: true,
      secure: true,
      path: '/',
      sameSite: 'Strict',
      maxAge: 60 * 60 * 24
    });

    return c.json({ success: true });
  } catch (err) {
    console.error('Signup error:', err);
    return c.json({ error: 'Signup failed' }, 400);
  }
});

routes.post('/api/logout', async (c) => {
  deleteCookie(c, 'session', { path: '/' });
  return c.redirect('/');
});

// Error handlers
routes.notFound((c) => {
  Logger.log('WARN', 'Page not found', { path: c.req.path });
  return c.html(renderTemplate(errorTemplates.notFound));
});

routes.onError((err, c) => {
  Logger.log('ERROR', 'Application error', {
    error: err.message,
    stack: err.stack,
    path: c.req.path
  });
  return c.html(renderTemplate(() => errorTemplates.serverError(err)));
});

export default routes;

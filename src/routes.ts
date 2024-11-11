import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { rateLimit, sanitize, memoryAccessControl } from './middleware';
import {
  validateEmail,
  hashPassword,
  generateSecureKey,
  validatePassword,
  SessionDO,
  AppError
  // validatePasswordStrength
} from './shared';
import { templates, renderTemplate, errorTemplates } from './Components';
import type { Env } from './types';
import { Logger } from './shared';
import { MemoryService } from './services/memoryService';

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


const routes = new Hono<{ Bindings: Env }>();

// Logging middleware
routes.use('*', async (c, next) => {
  Logger.log('INFO', `Request: ${c.req.method} ${c.req.path}`, {
    requestId: crypto.randomUUID()
  });
  await next();
});

// Public routes - NO auth middleware
const publicRoutes = new Hono<{ Bindings: Env }>();

publicRoutes.get('/', async (c) => {
  const sessionToken = getCookie(c, 'session');
  if (sessionToken) {
    return c.redirect('/dashboard');
  }
  return c.html(renderTemplate(() => templates.home()));
});

publicRoutes.get('/login', (c) => {
  return c.html(renderTemplate(() => templates.login()));
});

publicRoutes.get('/signup', (c) => {
  return c.html(renderTemplate(() => templates.signup()));
});

// Auth API routes - NO auth middleware
publicRoutes.post('/api/login', rateLimit(10, 60000), async (c) => {
  try {
    const formData = await c.req.parseBody();
    const email = String(formData.email || '');
    const password = String(formData.password || '');

    if (!email || !password || !validateEmail(email)) {
      return c.json({ error: 'Invalid credentials' }, 400);
    }

    const userData = await c.env.USERS_KV.get(email);
    if (!userData) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const user = JSON.parse(userData);
    const isValidPassword = await validatePassword(password, user.password);
    if (!isValidPassword) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const sessionToken = generateSecureKey(32);
    const sessionId = SessionDO.createSessionId(c.env.SESSIONS_DO, sessionToken);
    const sessionDO = c.env.SESSIONS_DO.get(sessionId);

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
      sameSite: 'Lax', // Changed from Strict to Lax for better compatibility
      maxAge: 60 * 60 * 24
    });

    return c.json({ success: true, redirect: '/dashboard' });
  } catch (error) {
    log('ERROR', 'Login failed', { error });
    return c.json({ error: 'Login failed' }, 500);
  }
});

publicRoutes.post('/api/signup', async (c) => {
  try {
    const { email, password, confirm_password } = await c.req.parseBody() as { email: string, password: string, confirm_password: string };

    if (!email || !password) {
      return c.json({ error: "Missing email or password" }, 400);
    }

    if (password !== confirm_password) {
      return c.json({ error: "Passwords do not match" }, 400);
    }

    if (!validateEmail(email)) {
      return c.json({ error: "Invalid email format" }, 400);
    }

    const existing = await c.env.USERS_KV.get(email);
    if (existing) {
      return c.json({ error: "Email already registered" }, 400);
    }

    const hashedPassword = await hashPassword(password);
    const user = { email, password: hashedPassword };
    await c.env.USERS_KV.put(email, JSON.stringify(user));

    const sessionToken = generateSecureKey(32);
    const sessionId = SessionDO.createSessionId(c.env.SESSIONS_DO, sessionToken);
    const sessionDO = c.env.SESSIONS_DO.get(sessionId);
    await sessionDO.fetch(new Request('https://dummy/save', {
      method: 'POST',
      body: email
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

publicRoutes.post('/api/logout', async (c) => {
  deleteCookie(c, 'session', { path: '/' });
  return c.redirect('/');
});

// Mount public routes FIRST
routes.route('/', publicRoutes);

// Protected routes with auth middleware
const protectedRoutes = new Hono<{ Bindings: Env, Variables: { userEmail: string, user: any } }>();
protectedRoutes.use('*', authMiddleware);

// Apply rate limiting only to protected API routes
protectedRoutes.use('/api/*', rateLimit());
protectedRoutes.use('/api/*', sanitize());
protectedRoutes.use('/api/memory/*', memoryAccessControl);

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

// Add API endpoints for dashboard data
protectedRoutes.get('/api/stats/notes', async (c) => {
  try {
    const userEmail = c.get('userEmail');
    const { results } = await c.env.DATABASE.prepare(
      'SELECT COUNT(*) as count FROM notes WHERE userEmail = ?'
    ).bind(userEmail).all();
    return c.json({ count: results[0].count });
  } catch (error) {
    return c.json({ error: 'Failed to fetch notes count' }, 500);
  }
});

protectedRoutes.get('/api/stats/folders', async (c) => {
  try {
    const userEmail = c.get('userEmail');
    const { results } = await c.env.DATABASE.prepare(
      'SELECT COUNT(*) as count FROM memory_folders WHERE userEmail = ?'
    ).bind(userEmail).all();
    return c.json({ count: results[0].count });
  } catch (error) {
    return c.json({ error: 'Failed to fetch folders count' }, 500);
  }
});

protectedRoutes.get('/api/activity', async (c) => {
  try {
    const userEmail = c.get('userEmail');
    const { results } = await c.env.DATABASE.prepare(`
      SELECT * FROM (
        SELECT 'note' as type, created_at, text as content FROM notes
        WHERE userEmail = ?
        UNION ALL
        SELECT 'folder' as type, created_at, name as content FROM memory_folders
        WHERE userEmail = ?
      ) activity
      ORDER BY created_at DESC LIMIT 10
    `).bind(userEmail, userEmail).all();

    return c.json({ activities: results });
  } catch (error) {
    return c.json({ error: 'Failed to fetch activity' }, 500);
  }
});

// Memory routes
protectedRoutes.get('/api/memory/folders', async (c) => {
  try {
    const userEmail = c.get('userEmail');
    const parentId = c.req.query('parentId');
    const memoryService = new MemoryService(c.env);
    const folders = await memoryService.getFolders(userEmail, parentId);
    return c.json({ folders });
  } catch (error: unknown) {
    log('ERROR', 'Failed to fetch memory folders', { error });
    const err = error as Error;
    return c.json({
      error: error instanceof AppError ? (error as AppError).message : 'Failed to fetch folders',
      code: error instanceof AppError ? (error as AppError).code : 'UNKNOWN_ERROR'
    }, { status: error instanceof AppError ? (error as AppError).status : 500 });
  }
});

protectedRoutes.post('/api/memory/folders', async (c) => {
  try {
    const userEmail = c.get('userEmail');
    const data = await c.req.json();
    const memoryService = new MemoryService(c.env);
    const folder = await memoryService.createFolder(userEmail, data);
    return c.json({ folder });
  } catch (error: unknown) {
    log('ERROR', 'Failed to create memory folder', { error });
    const err = error as Error;
    return c.json({
      error: error instanceof AppError ? (error as AppError).message : err.message || 'Failed to create folder',
      code: error instanceof AppError ? (error as AppError).code : 'UNKNOWN_ERROR'
    }, { status: error instanceof AppError ? (error as AppError).status : 500 });
  }
});

protectedRoutes.patch('/api/memory/folders/:id', async (c) => {
  try {
    const userEmail = c.get('userEmail');
    const id = c.req.param('id');
    const data = await c.req.json();
    const memoryService = new MemoryService(c.env);
    const folder = await memoryService.updateFolder(id, userEmail, data);
    return c.json({ folder });
  } catch (error: unknown) {
    log('ERROR', 'Failed to update memory folder', { error });
    const err = error as Error;
    return c.json({
      error: error instanceof AppError ? (error as AppError).message : 'Failed to update folder',
      code: error instanceof AppError ? (error as AppError).code : 'UNKNOWN_ERROR'
    }, { status: error instanceof AppError ? (error as AppError).status : 500 });
      }
    });

protectedRoutes.delete('/api/memory/folders/:id', async (c) => {
  try {
    const userEmail = c.get('userEmail');
    const id = c.req.param('id');
    const memoryService = new MemoryService(c.env);
    await memoryService.deleteFolder(id, userEmail);
    return c.json({ success: true });
  } catch (error: unknown) {
    log('ERROR', 'Failed to delete memory folder', { error });
    const err = error as Error;
    return c.json({
      error: error instanceof AppError ? (error as AppError).message : 'Failed to delete folder',
      code: error instanceof AppError ? (error as AppError).code : 'UNKNOWN_ERROR'
    }, { status: error instanceof AppError ? (error as AppError).status : 500 });
  }
});

// Mount protected routes AFTER public routes
routes.route('/', protectedRoutes);

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
function log(level: 'DEBUG' | 'INFO' | 'ERROR' | 'WARN', message: string, data?: any) {
	Logger.log(level, message, data);
}

templates.memory = () => {
  return baseLayout('Memory', '<div id="folder-list"></div>');
};

function baseLayout(title: string, content: string): string {
	return `
<!DOCTYPE html>
<html lang="en">
templates.memory = () => {
  return baseLayout('Memory', '<div id="folder-list"></div>');
};
	<title>${title}</title>
	<script src="https://unpkg.com/htmx.org"></script>
	<link rel="stylesheet" href="/static/css/styles.css">
</head>
<body>
	<nav class="main-nav">
		<a href="/dashboard">Dashboard</a>
		<a href="/notes">Notes</a>
		<a href="/memory">Memory</a>
		<a href="/settings">Settings</a>
		<a href="/profile">Profile</a>
		<form action="/api/logout" method="POST" style="display: inline;">
			<button type="submit">Logout</button>
		</form>
	</nav>
	<main class="container">
		${content}
	</main>
</body>
</html>
`;
}


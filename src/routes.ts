import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { validateEmail, hashPassword, generateSecureKey, safeExecute } from './utils';
import type { Env } from './types';
import { templates } from './Components';

// Consolidated error responses
const errors = {
  auth: {
    invalidCreds: { error: 'Invalid credentials', status: 401 },
    notFound: { error: 'User not found', status: 404 },
    missingFields: { error: 'Required fields missing', status: 400 },
    passwordMismatch: { error: 'Passwords do not match', status: 400 },
    passwordLength: { error: 'Password must be at least 8 characters', status: 400 },
    emailExists: { error: 'Email already registered', status: 400 },
    noSession: { error: 'No active session', status: 401 }
  }
};

// Add environment validation function
export function validateEnv(env: Env) {
  const required = ['DATABASE', 'USERS_KV', 'SESSIONS_DO', 'AI', 'VECTOR_INDEX'];
  const missing = required.filter(key => !(key in env));
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Auth middleware with improved error handling
export const authMiddleware = async (c: any, next: () => Promise<any>) => {
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

const routes = new Hono<{ Bindings: Env }>();

// Auth Routes
routes.get('/login', (c) => c.html(templates.login()));
routes.get('/signup', (c) => c.html(templates.signup()));

routes.post('/login', async (c) => {
  return await safeExecute(async () => {
    const { email, password } = await c.req.json();

    if (!email || !password || !validateEmail(email)) {
      return c.json(errors.auth.missingFields);
    }

    const userData = await c.env.USERS_KV.get(email);
    if (!userData) return c.json(errors.auth.invalidCreds);

    const user = JSON.parse(userData);
    const hashedPassword = await hashPassword(password);

    if (user.password !== hashedPassword) {
      return c.json(errors.auth.invalidCreds);
    }

    const sessionToken = generateSecureKey(32);
    await createSession(c, email, sessionToken);

    return c.redirect('/');
  }, 'Login failed');
});

// Helper function to create session
async function createSession(c: any, email: string, token: string) {
  const sessionId = SessionDO.createSessionId(c.env.SESSIONS_DO, token);
  const sessionDO = c.env.SESSIONS_DO.get(sessionId);
  await sessionDO.fetch(new Request('https://dummy/save', {
    method: 'POST',
    body: email
  }));

  setCookie(c, 'session', token, {
    httpOnly: true,
    secure: true,
    path: '/',
    sameSite: 'Strict',
    maxAge: 60 * 60 * 24
  });
}

routes.all('/signup', async (c) => {
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

    return c.redirect('/');
  } catch (err) {
    console.error('Signup error:', err);
    return c.json({ error: "An error occurred during signup" }, 500);
  }
});

routes.post('/logout', async (c) => {
  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) {
    return c.json({ message: 'No active session' }, 400);
  }

  deleteCookie(c, 'session', { path: '/' });
  return c.json({ message: 'Logged out successfully' });
});

// Profile Routes
routes.get('/profile', authMiddleware, async (c) => {
  const userEmail = c.get('userEmail');
  const userData = await c.env.USERS_KV.get(userEmail);
  if (!userData) {
    return c.json({ error: 'User not found' }, 404);
  }
  return c.html(profileTemplate());
});

routes.post('/profile', authMiddleware, async (c) => {
  const userEmail = c.get('userEmail');
  const userData = await c.env.USERS_KV.get(userEmail);
  const user = JSON.parse(userData);
  const { display_name, bio } = await c.req.json();

  user.display_name = display_name;
  user.bio = bio;

  await c.env.USERS_KV.put(userEmail, JSON.stringify(user));
  return c.json({ message: 'Profile updated successfully' });
});

// Settings Routes
routes.get('/settings', authMiddleware, async (c) => {
  const userEmail = c.get('userEmail');
  const userData = await c.env.USERS_KV.get(userEmail);
  if (!userData) {
    return c.json({ error: 'User not found' }, 404);
  }
  return c.html(settingsTemplate());
});

routes.post('/settings', authMiddleware, async (c) => {
  const userEmail = c.get('userEmail');
  const { current_password, new_password } = await c.req.json();
  const userData = await c.env.USERS_KV.get(userEmail);

  if (current_password && new_password) {
    const hashedCurrentPassword = await hashPassword(current_password);
    const user = JSON.parse(userData);

    if (user.password !== hashedCurrentPassword) {
      return c.json({ error: 'Invalid current password' }, 400);
    }

    const hashedNewPassword = await hashPassword(new_password);
    user.password = hashedNewPassword;
    await c.env.USERS_KV.put(userEmail, JSON.stringify(user));
  }
  return c.json({ message: 'Settings updated successfully' });
});

// Notes Routes
routes.get('/notes', authMiddleware, async (c) => {
  const userEmail = c.get('userEmail');
  try {
    const query = `SELECT * FROM notes WHERE userEmail = ?`
    const { results } = await c.env.DATABASE.prepare(query).bind(userEmail).all()
    return c.json(results || [])
  } catch (error) {
    console.error('Error fetching notes:', error)
    return c.json({ error: 'Failed to fetch notes' }, 500)
  }
});

routes.post('/notes', authMiddleware, async (c) => {
  const userEmail = c.get('userEmail');
  const { text } = await c.req.json();
  try {
    const query = `INSERT INTO notes (userEmail, text) VALUES (?, ?)`
    await c.env.DATABASE.prepare(query).bind(userEmail, text).run()
    return c.json({ success: true })
  } catch (error) {
    console.error('Error adding note:', error)
    return c.json({ error: 'Failed to add note' }, 500)
  }
});

// Memory Routes
routes.get('/memory', authMiddleware, (c) => c.html(memoryTemplate()));

// Home Route
routes.get('/', authMiddleware, (c) => c.html(homeTemplate()));

// Catch-all route
routes.all('*', (c) => c.text('Not found', 404));

export default routes;

import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import {
  profileTemplate,
  memoryTemplate,
  notesTemplate,
  loginTemplate,
  signupTemplate,
  settingsTemplate,
  homeTemplate
} from './Components';
import { SessionDO } from './session';
import { hashPassword, generateSecureKey } from './utils';
import type { Env } from './types';

const routes = new Hono<{ Bindings: Env }>();

// Authentication middleware
const requireAuth = async (c: any, next: () => Promise<any>) => {
  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) {
    return c.redirect('/login');
  }

  const sessionId = SessionDO.createSessionId(c.env.SESSIONS_DO, sessionToken);
  const sessionDO = c.env.SESSIONS_DO.get(sessionId);
  const response = await sessionDO.fetch(new Request('https://dummy/get'));

  if (!response.ok) {
    return c.redirect('/login');
  }

  const userEmail = await response.text();
  if (!userEmail) {
    return c.redirect('/login');
  }

  c.set('userEmail', userEmail);
  await next();
};

// Auth Routes
routes.get('/login', (c) => c.html(loginTemplate()));
routes.get('/signup', (c) => c.html(signupTemplate()));

routes.all('/login', async (c) => {
  if (c.req.method !== 'POST') {
    return c.text('Method not allowed', 405);
  }
  try {
    const formData = await c.req.parseBody();
    const { email, password } = formData;

    if (!email || !password) {
      console.log('Email or password missing');
      return c.json({ error: 'Email and password are required' }, 400);
    }

    const userData = await c.env.USERS_KV.get(email);
    if (!userData) {
      console.log('Invalid credentials for email:', email);
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const user = JSON.parse(userData);
    const hashedPassword = await hashPassword(password as string);

    if (user.password !== hashedPassword) {
      console.log('Invalid credentials for email:', email);
      return c.json({ error: 'Invalid credentials' }, 401);
    }

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
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

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
routes.get('/profile', requireAuth, async (c) => {
  const userEmail = c.get('userEmail');
  const userData = await c.env.USERS_KV.get(userEmail);
  if (!userData) {
    return c.json({ error: 'User not found' }, 404);
  }
  return c.html(profileTemplate());
});

routes.post('/profile', requireAuth, async (c) => {
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
routes.get('/settings', requireAuth, async (c) => {
  const userEmail = c.get('userEmail');
  const userData = await c.env.USERS_KV.get(userEmail);
  if (!userData) {
    return c.json({ error: 'User not found' }, 404);
  }
  return c.html(settingsTemplate());
});

routes.post('/settings', requireAuth, async (c) => {
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
routes.get('/notes', requireAuth, async (c) => {
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

routes.post('/notes', requireAuth, async (c) => {
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
routes.get('/memory', requireAuth, (c) => c.html(memoryTemplate()));

// Home Route
routes.get('/', requireAuth, (c) => c.html(homeTemplate()));

// Catch-all route
routes.all('*', (c) => c.text('Not found', 404));

export default routes;

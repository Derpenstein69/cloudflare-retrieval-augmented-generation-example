import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { profileTemplate } from './components/profile';
import { memoryTemplate } from './components/memory';
import { notesTemplate } from './components/notes';
import { SessionDO } from './session';
import type { Env, Note } from './types';

const routes = new Hono<{ Bindings: Env }>();

// Profile Routes
routes.get('/profile', async (c) => {
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

  const userData = await c.env.USERS_KV.get(userEmail);
  if (!userData) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.html(profileTemplate());
});

routes.post('/profile', async (c) => {
  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const sessionId = SessionDO.createSessionId(c.env.SESSIONS_DO, sessionToken);
  const sessionDO = c.env.SESSIONS_DO.get(sessionId);
  const response = await sessionDO.fetch(new Request('https://dummy/get'));

  if (!response.ok) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const userEmail = await response.text();
  if (!userEmail) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const userData = await c.env.USERS_KV.get(userEmail);
  const user = JSON.parse(userData);
  const { display_name, bio } = await c.req.json();

  user.display_name = display_name;
  user.bio = bio;

  await c.env.USERS_KV.put(userEmail, JSON.stringify(user));
  return c.json({ message: 'Profile updated successfully' });
});

// Notes Routes
routes.get('/notes', async (c) => {
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

  try {
    const query = `SELECT * FROM notes WHERE userEmail = ?`
    const { results } = await c.env.DATABASE.prepare(query).bind(userEmail).all()
    return c.json(results || [])
  } catch (error) {
    console.error('Error fetching notes:', error)
    return c.json({ error: 'Failed to fetch notes' }, 500)
  }
});

routes.post('/notes', async (c) => {
  const sessionToken = getCookie(c, 'session');
  if (!sessionToken) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const sessionId = SessionDO.createSessionId(c.env.SESSIONS_DO, sessionToken);
  const sessionDO = c.env.SESSIONS_DO.get(sessionId);
  const response = await sessionDO.fetch(new Request('https://dummy/get'));

  if (!response.ok) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const userEmail = await response.text();
  if (!userEmail) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

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
routes.get('/memory', (c) => c.html(memoryTemplate()));

export default routes;

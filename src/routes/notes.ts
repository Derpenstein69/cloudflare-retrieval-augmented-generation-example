import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { SessionDO } from '../session';
import type { Env, Note } from '../types';

const notes = new Hono<{ Bindings: Env }>();

notes.get('/', async (c) => {
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

  console.log('DATABASE binding:', c.env.DATABASE); // Log DATABASE binding

  try {
    const query = `SELECT * FROM notes WHERE userEmail = ?`
    const { results } = await c.env.DATABASE.prepare(query).bind(userEmail).all()
    return c.json(results || [])
  } catch (error) {
    console.error('Error fetching notes:', error)
    return c.json({ error: 'Failed to fetch notes' }, 500)
  }
});

notes.post('/', async (c) => {
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
  console.log('Adding note for user:', userEmail)

  try {
    const query = `INSERT INTO notes (userEmail, text) VALUES (?, ?)`
    await c.env.DATABASE.prepare(query).bind(userEmail, text).run()
    return c.json({ success: true })
  } catch (error) {
    console.error('Error adding note:', error)
    return c.json({ error: 'Failed to add note' }, 500)
  }
});

export default notes;
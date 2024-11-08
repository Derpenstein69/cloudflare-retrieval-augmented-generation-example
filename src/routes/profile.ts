import { Hono } from 'hono';
import { profileTemplate } from '../components/profile';
import type { Env } from '../types';

const profile = new Hono<{ Bindings: Env }>();

profile.get('/', async (c) => {
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

profile.post('/', async (c) => {
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

export default profile;
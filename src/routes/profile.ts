import { Hono } from 'hono';
import { profileTemplate } from '../components/profile';
import type { Env } from '../types';

const profile = new Hono<{ Bindings: Env }>();

profile.get('/profile', async (c) => {
  const sessionId = c.req.cookie('session');
  if (!sessionId) {
    return c.redirect('/login');
  }

  const userEmail = await c.env.SESSIONS_DO.get(sessionId);
  if (!userEmail) {
    return c.redirect('/login');
  }

  const userData = await c.env.USERS_KV.get(userEmail);
  if (!userData) {
    return c.json({ error: 'User not found' }, 404);
  }

  const user = JSON.parse(userData);
  return c.json(user);
});

profile.post('/profile', async (c) => {
  const sessionId = c.req.cookie('session');
  if (!sessionId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const userEmail = await c.env.SESSIONS_DO.get(sessionId);
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
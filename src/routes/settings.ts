import { Hono } from 'hono';
import { settingsTemplate } from '../components/settings';
import { hashPassword } from '../utils';
import type { Env } from '../types';
import { getCookie } from 'hono/cookie';

const settings = new Hono<{ Bindings: Env }>();

settings.get('/settings', async (c) => {
  const sessionId = getCookie(c, 'session');
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

  return c.html(settingsTemplate());
});

settings.post('/settings', async (c) => {
  const sessionId = getCookie(c, 'session');
  if (!sessionId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const userEmail = await c.env.SESSIONS_DO.get(sessionId);
  if (!userEmail) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

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

export default settings;

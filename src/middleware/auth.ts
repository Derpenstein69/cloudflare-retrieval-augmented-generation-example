import { verify } from 'hono/jwt'  // Changed this line
import { getCookie } from 'hono/cookie'
import type { Env } from '../types'
import { Context } from 'hono'

export const checkAuth = async (c, next) => {
  const token = getCookie(c, 'token');
  if (!token) {
    return c.redirect('/login');
  }

  try {
    const jwtSecret = await c.env.USERS_KV.get('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT secret not found');
    }
    
    // Changed jwt.verify to verify
    await verify(token, jwtSecret);
    await next();
  } catch (e) {
    return c.redirect('/login');
  }
};

export const validateEnv = (env: Env) => {
  if (!env.USERS_KV) throw new Error('USERS_KV is not configured');
  // Removed JWT_SECRET check since we're using KV-stored secret
};

export const authMiddleware = async (c: Context<{ Bindings: Env }>, next: Function) => {
  const sessionId = getCookie(c, 'session')
  if (!sessionId) {
    return c.redirect('/login')
  }

  try {
    const userEmail = await c.env.SESSIONS_DO.get(sessionId)
    if (!userEmail) {
      return c.redirect('/login')
    }

    // Store the user email in the context for later use
    c.set('userEmail', userEmail)
    await next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return c.redirect('/login')
  }
}

auth.get('/login', async (c) => {
  const sessionId = getCookie(c, 'session');
  if (sessionId) {
    const userEmail = await c.env.SESSIONS_DO.get(sessionId);
    if (userEmail) {
      return c.redirect('/');
    }
  }
  return c.html(loginTemplate());
});
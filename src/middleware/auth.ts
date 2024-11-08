import { getCookie } from 'hono/cookie'
import { verify } from 'hono/jwt'
import type { Env } from '../types'
import { Context } from 'hono'

export const authMiddleware = async (c: Context<{ Bindings: Env }>, next: Function) => {
  const token = getCookie(c, 'session')
  console.log('Session token:', token);
  if (!token) {
    console.log('No session token found, redirecting to login');
    return c.redirect('/login')
  }

  try {
    const payload = await verify(token, 'your-secret-key')
    if (!payload || !payload.email) {
      console.error('Invalid token payload:', payload);
      return c.redirect('/login');
    }
    console.log('Token payload:', payload);
    c.set('userEmail', payload.email)
    console.log('Authenticated user:', payload.email);
    return await next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return c.redirect('/login')
  }
}

export const validateEnv = (env: Env) => {
  if (!env.USERS_KV) throw new Error('USERS_KV is not configured');
  if (!env.SESSIONS_DO) throw new Error('SESSIONS_DO is not configured');
};
import { getCookie } from 'hono/cookie'
import type { Env } from '../types'
import { Context } from 'hono'

export const authMiddleware = async (c: Context<{ Bindings: Env }>, next: Function) => {
  const sessionId = getCookie(c, 'session')
  if (!sessionId) {
    return c.redirect('/login')
  }

  try {
    const sessionDOId = c.env.SESSIONS_DO.idFromName(sessionId);
    const sessionDO = c.env.SESSIONS_DO.get(sessionDOId);
    
    const response = await sessionDO.fetch(new Request('https://dummy-url/get'));
    const userEmail = await response.text();
    
    if (!userEmail) {
      return c.redirect('/login')
    }

    c.set('userEmail', userEmail)
    await next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return c.redirect('/login')
  }
}

// Remove checkAuth since we're using authMiddleware
export const validateEnv = (env: Env) => {
  if (!env.USERS_KV) throw new Error('USERS_KV is not configured');
  if (!env.SESSIONS_DO) throw new Error('SESSIONS_DO is not configured');
};
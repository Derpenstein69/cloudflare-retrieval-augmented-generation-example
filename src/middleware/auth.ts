import { getCookie } from 'hono/cookie'
import type { Env } from '../types'
import { Context } from 'hono'

export const authMiddleware = async (c: Context<{ Bindings: Env }>, next: Function) => {
  const sessionId = getCookie(c, 'session')
  console.log('Session token:', sessionId);
  
  if (!sessionId) {
    console.log('No session token found, redirecting to login');
    return c.redirect('/login')
  }

  try {
    const response = await c.env.SESSIONS_DO.get(sessionId).fetch(new Request('https://dummy/get'))
    const email = await response.text()
    
    if (!email) {
      console.error('No email found in session');
      return c.redirect('/login');
    }

    console.log('Authenticated user:', email);
    c.set('userEmail', email)
    return next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return c.redirect('/login')
  }
}

export const validateEnv = (env: Env) => {
  if (!env.USERS_KV) throw new Error('USERS_KV is not configured');
  if (!env.SESSIONS_DO) throw new Error('SESSIONS_DO is not configured');
};
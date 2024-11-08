import { getCookie } from 'hono/cookie'
import type { Env } from '../types'
import { Context } from 'hono'
import { SessionDO } from '../session'

export const authMiddleware = async (c: Context<{ Bindings: Env }>, next: Function) => {
  const sessionToken = getCookie(c, 'session')
  console.log('Session token:', sessionToken);
  
  if (!sessionToken) {
    console.log('No session token found, redirecting to login');
    return c.redirect('/login')
  }

  try {
    const sessionId = SessionDO.createSessionId(c.env.SESSIONS_DO, sessionToken)
    const sessionDO = c.env.SESSIONS_DO.get(sessionId)
    const response = await sessionDO.fetch(new Request('https://dummy/get'))
    
    if (!response.ok) {
      console.error('Session fetch failed:', await response.text());
      return c.redirect('/login');
    }

    const email = await response.text()
    
    if (!email) {
      console.error('No email found in session');
      return c.redirect('/login');
    }

    console.log('Authenticated user:', email);
    c.set('userEmail', email)
    const result = await next()
    return result
  } catch (error) {
    console.error('Auth middleware error:', error)
    return c.redirect('/login')
  }
}

export const validateEnv = (env: Env) => {
  if (!env.USERS_KV) throw new Error('USERS_KV is not configured');
  if (!env.SESSIONS_DO) throw new Error('SESSIONS_DO is not configured');
  if (!env.DATABASE) throw new Error('DATABASE is not configured'); // Ensure DATABASE is validated
};
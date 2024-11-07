import { verify } from 'hono/jwt'  // Changed this line
import { getCookie } from 'hono/cookie'
import type { Env } from '../types'

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
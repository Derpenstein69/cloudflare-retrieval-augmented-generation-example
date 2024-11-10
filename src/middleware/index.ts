import { Context } from 'hono';

import { JSDOM } from 'jsdom';

// Sanitize Middleware
const sanitizeHtml = (input: string): string => {
  const dom = new JSDOM();
  const element = dom.window.document.createElement('div');
  element.innerText = input;
  return element.innerHTML;
};

const sanitize = () => {
  return async (c: Context, next: () => Promise<void>) => {
    try {
      const body = await c.req.json();
      for (const key in body) {
        if (typeof body[key] === 'string') {
          body[key] = sanitizeHtml(body[key]);
        }
      }
      c.set('sanitizedBody', body);
      await next();
    } catch (error) {
      console.error('Sanitize middleware error:', error);
      return c.json({ error: 'Failed to sanitize input' }, 500);
    }
  };
};

// Validate Middleware
const validate = (requiredFields: string[]) => {
  return async (c: Context, next: () => Promise<void>) => {
    try {
      const body = await c.req.json();
      for (const field of requiredFields) {
        if (!body[field]) {
          return c.json({ error: `Missing required field: ${field}` }, 400);
        }
      }
      await next();
    } catch (error) {
      console.error('Validate middleware error:', error);
      return c.json({ error: 'Failed to validate input' }, 500);
    }
  };
};

// Rate Limit Middleware
const rateLimit = (limit: number = 100, windowMs: number = 60000) => {
  const cache = new Map<string, { count: number; resetTime: number }>();

  return async (c: Context, next: () => Promise<void>) => {
    try {
      const key = c.req.header('cf-connecting-ip') || c.req.header('x-real-ip') || 'unknown';
      const now = Date.now();
      const record = cache.get(key);

      if (!record) {
        cache.set(key, { count: 1, resetTime: now + windowMs });
      } else {
        if (now > record.resetTime) {
          cache.set(key, { count: 1, resetTime: now + windowMs });
        } else {
          record.count++;
          if (record.count > limit) {
            return c.json({ error: 'Rate limit exceeded' }, 429);
          }
        }
      }

      await next();
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      return c.json({ error: 'Failed to apply rate limit' }, 500);
    }
  };
};

export { sanitize, validate, rateLimit };

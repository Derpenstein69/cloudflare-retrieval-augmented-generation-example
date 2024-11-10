import { Context } from 'hono';

// Sanitize Middleware
const sanitizeHtml = (input: string): string => {
  // Simple HTML sanitization using regex
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Sanitize input middleware
export const sanitize = () => {
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
export const validate = (requiredFields: string[]) => {
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
export const rateLimit = (limit: number = 100, windowMs: number = 60000) => {
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

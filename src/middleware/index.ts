import { Context, Hono } from 'hono';

export const protectedRoutes = new Hono();

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

export const memoryAccessControl = async (c: Context, next: () => Promise<void>) => {
  try {
    const userEmail = c.get('userEmail');
    const folderId = c.req.param('id');

    if (!userEmail) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    if (folderId) {
      const folder = await c.env.DATABASE.prepare(
        'SELECT * FROM memory_folders WHERE id = ? AND userEmail = ?'
      ).bind(folderId, userEmail).first();

      if (!folder) {
        return c.json({ error: 'Folder not found or access denied' }, 404);
      }

      c.set('folder', folder);
    }

    await next();
  } catch (error) {
    console.error('Access control error:', error);
    return c.json({ error: 'Access control check failed' }, 500);
  }
};

// Apply middleware to memory routes
protectedRoutes.use('/api/memory/*', memoryAccessControl);

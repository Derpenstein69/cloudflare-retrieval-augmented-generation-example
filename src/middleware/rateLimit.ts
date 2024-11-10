
import { Context } from 'hono';

const rateLimit = (limit: number = 100, windowMs: number = 60000) => {
  const cache = new Map<string, { count: number; resetTime: number }>();

  return async (c: Context, next: () => Promise<void>) => {
    const key = c.req.headers.get('cf-connecting-ip') || c.req.headers.get('x-real-ip') || 'unknown';
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
  };
};

export { rateLimit };

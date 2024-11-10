
import { Context } from 'hono';
import DOMPurify from 'dompurify';

const sanitize = () => {
  return async (c: Context, next: () => Promise<void>) => {
    const body = await c.req.json();
    for (const key in body) {
      if (typeof body[key] === 'string') {
        body[key] = DOMPurify.sanitize(body[key]);
      }
    }
    c.req.body = JSON.stringify(body);
    await next();
  };
};

export { sanitize };


import { Context } from 'hono';

const validate = (requiredFields: string[]) => {
  return async (c: Context, next: () => Promise<void>) => {
    const body = await c.req.json();
    for (const field of requiredFields) {
      if (!body[field]) {
        return c.json({ error: `Missing required field: ${field}` }, 400);
      }
    }
    await next();
  };
};

export { validate };

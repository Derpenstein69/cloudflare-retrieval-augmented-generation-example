import { Context } from 'hono';

const sanitizeHtml = (input: string): string => {
  const element = document.createElement('div');
  element.innerText = input;
  return element.innerHTML;
};

const sanitize = () => {
  return async (c: Context, next: () => Promise<void>) => {
    const body = await c.req.json();
    for (const key in body) {
      if (typeof body[key] === 'string') {
        body[key] = sanitizeHtml(body[key]);
      }
    }
    c.req.body = JSON.stringify(body);
    await next();
  };
};

export { sanitize };

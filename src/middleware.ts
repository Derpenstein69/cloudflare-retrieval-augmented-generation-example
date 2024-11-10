import type { Context } from 'hono';
import type { Env } from './types';

export const errorHandler = async (err: Error, c: Context<{ Bindings: Env }>) => {
  console.error('Application error:', err);
  return c.json({ error: 'Internal server error' }, 500);
};

export const notFoundHandler = (c: Context) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>404 Not Found - RusstCorp</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/water.css@2/out/water.css">
      </head>
      <body>
        <h1>Page Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <a href="/">Return to Home</a>
      </body>
    </html>
  `, 404);
};

export function validateEnv(env: Env) {
  const required = ['DATABASE', 'USERS_KV', 'SESSIONS_DO', 'AI', 'VECTOR_INDEX'];
  const missing = required.filter(key => !(key in env));
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export const validateRequest = async (c: Context<{ Bindings: Env }>, next: () => Promise<void>) => {
  try {
    // Add request validation logic here
    await next();
  } catch (err) {
    throw err;
  }
};

import type { Context } from 'hono';
import type { Env } from './types';
import { getCookie } from 'hono/cookie';
import { SessionDO } from './session';

// Middleware
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

export const authMiddleware = async (c: Context<{ Bindings: Env }>, next: () => Promise<void>) => {
  try {
    const sessionToken = getCookie(c, 'session');
    if (!sessionToken) throw new Error('No session token');

    const sessionId = SessionDO.createSessionId(c.env.SESSIONS_DO, sessionToken);
    const sessionDO = c.env.SESSIONS_DO.get(sessionId);
    const response = await sessionDO.fetch(new Request('https://dummy/get'));

    if (!response.ok) throw new Error('Invalid session');

    const userEmail = await response.text();
    if (!userEmail) throw new Error('No user email');

    c.set('userEmail', userEmail);
    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.redirect('/login');
  }
};

// Common Layouts
export const baseLayout = (title: string, content: string) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>${title} | RusstCorp</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/water.css@2/out/water.css">
    ${commonStyles}
  </head>
  <body>
    ${actionBar}
    ${content}
    ${themeScript}
  </body>
</html>
`;

// Common Components
export const actionBar = `
<div class="action-bar">
  <div class="menu-toggle" onclick="toggleSidebar()">☰</div>
  <div class="home-button" onclick="goHome()">🏠</div>
  <div class="title">RusstCorp</div>
  <div class="theme-toggle" onclick="toggleTheme()">🌓</div>
  <div class="user-icon" onclick="toggleMenu()">👤
    <ul class="menu" id="user-menu">
      <li class="menu-item" onclick="loadContent('/profile')">Profile</li>
      <li class="menu-item" onclick="loadContent('/settings')">Settings</li>
      <li class="menu-item" onclick="handleLogout()">Logout</li>
    </ul>
  </div>
</div>
`;

// Common Styles
export const commonStyles = `
<style>
  :root {
    --primary-color: white;
    --secondary-color: #d3d3d3;
    --text-color: black;
  }
  // ...existing styles...
</style>
`;

// Theme Script
export const themeScript = `
<script>
  // ...existing theme script...
</script>
`;

// Environment validation
export function validateEnv(env: Env) {
  const required = ['DATABASE', 'USERS_KV', 'SESSIONS_DO', 'AI', 'VECTOR_INDEX'];
  const missing = required.filter(key => !(key in env));
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

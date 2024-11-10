import { baseLayout, sharedStyles, themeScript } from './shared';
import { api } from './api-service';
import { state } from './state';
import {
  AuthStatus,
  NotificationType,
  ThemeMode,
  User,
  Note,
  MemoryFolder,
  AppState,
  UserPreferences,
  UIState,
  AuthState
} from './types';
import type { Context } from 'hono';
import { getCookie, deleteCookie } from 'hono/cookie';
import type { Env } from './types';
import { errorTemplates, renderTemplate } from './Components';

// Theme configuration
const themeConfig = {
  light: {
    '--primary-bg': '#ffffff',
    '--secondary-bg': '#f5f5f5',
    '--accent-color': '#007bff',
    '--text-primary': '#333333',
    '--text-secondary': '#666666',
    '--border-color': '#dddddd',
    '--error-color': '#dc3545',
    '--success-color': '#28a745',
    '--warning-color': '#ffc107',
    '--shadow-color': 'rgba(0,0,0,0.1)',
    '--input-bg': '#ffffff',
    '--input-text': '#333333',
    '--button-primary-bg': '#007bff',
    '--button-primary-text': '#ffffff',
  },
  dark: {
    '--primary-bg': '#1a1a1a',
    '--secondary-bg': '#2d2d2d',
    '--accent-color': '#4dabf7',
    '--text-primary': '#ffffff',
    '--text-secondary': '#bbbbbb',
    '--border-color': '#404040',
    '--error-color': '#ff4444',
    '--success-color': '#4caf50',
    '--warning-color': '#ffeb3b',
    '--shadow-color': 'rgba(0,0,0,0.3)',
    '--input-bg': '#333333',
    '--input-text': '#ffffff',
    '--button-primary-bg': '#4dabf7',
    '--button-primary-text': '#ffffff',
  }
};

// Shared styles and theme script that was previously in shared.ts
export const sharedStyles = `
  <style>
    :root {
      ${Object.entries(themeConfig.light)
        .map(([prop, value]) => `${prop}: ${value};`)
        .join('\n      ')}
    }

    @media (prefers-color-scheme: dark) {
      :root {
        ${Object.entries(themeConfig.dark)
          .map(([prop, value]) => `${prop}: ${value};`)
          .join('\n      ')}
      }
    }

    body {
      margin: 0;
      padding: 0;
      background-color: var(--primary-bg);
      color: var(--text-primary);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .content {
      background-color: var(--secondary-bg);
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 4px 6px var(--shadow-color);
      width: 100%;
      max-width: 400px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      background-color: var(--secondary-bg);
      color: var(--text-primary);
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      border-bottom: 1px solid var(--border-color);
    }
    .auth-container {
      max-width: 400px;
      margin: 2rem auto;
      padding: 2rem;
      background: var(--secondary-bg);
      border-radius: 8px;
      box-shadow: 0 2px 4px var(--shadow-color);
    }
    .form-group {
      margin-bottom: 1rem;
    }
    .error-container {
      color: var(--error-color);
      margin-bottom: 1rem;
      padding: 0.5rem;
      border: 1px solid var(--error-color);
      border-radius: 4px;
    }
    .title {
      text-align: center;
      flex-grow: 1;
    }
    .theme-toggle {
      cursor: pointer;
    }
    .user-icon {
      cursor: pointer;
      position: relative;
    }
    .menu {
      display: none;
      position: absolute;
      right: 0;
      top: 100%;
      background-color: var(--secondary-bg);
      color: var(--text-primary);
      box-shadow: 0 4px 8px var(--shadow-color);
      list-style: none;
      padding: 0;
      margin: 0;
      min-width: 150px;
      border: 1px solid var(--border-color);
    }
    .menu-item {
      padding: 10px;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .menu-item:hover {
      background-color: var(--primary-bg);
    }
    .sidebar {
      width: 200px;
      background-color: var(--secondary-bg);
      color: var(--text-primary);
      position: fixed;
      top: 40px; /* Adjusted to be directly below the action bar */
      left: 0;
      height: calc(100% - 40px); /* Adjusted to account for the action bar height */
      display: block; /* Changed from none to block for initial state */
    }
    .sidebar-item {
      padding: 10px;
      cursor: pointer;
    }
    .sidebar-item:hover {
      background-color: #c0c0c0; /* Slightly darker grey for hover effect */
    }
    .content {
      margin-top: 50px; /* Adjusted to account for the action bar height */
      margin-left: 200px; /* Set initial margin to match sidebar width */
      transition: margin-left 0.3s;
      padding: 20px; /* Add some padding */
    }
    .content.collapsed {
      margin-left: 0; /* Changed from expanded to collapsed pattern */
    }
    .home-button {
      cursor: pointer;
      margin-left: 10px;
    }
    .folders {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
      margin-top: 20px;
    }
    .folder {
      background-color: var(--secondary-bg);
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 6px var(--shadow-color);
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .folder:hover {
      background-color: var(--primary-bg);
    }
    .light-mode {
      --primary-color: white;
      --secondary-color: #d3d3d3;
      --text-color: black;
    }
    .dark-mode {
      --primary-color: #1a1a1a;
      --secondary-color: #333;
      --text-color: white;
    }
    .toast {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 10px 20px;
    }
  </style>
`;

// Base layout template
const baseLayout = (title: string, content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | RusstCorp</title>
  <link rel="stylesheet" href="/styles.css">
  ${sharedStyles}
</head>
<body>
  <div class="container">
    ${content}
  </div>
</body>
</html>
`;

// Login form component
const loginForm = `
<div class="auth-form">
  <h1>Login</h1>
  <form id="loginForm" hx-post="/login" hx-swap="outerHTML">
    <div class="form-group">
      <label for="email">Email</label>
      <input type="email" id="email" name="email" required>
    </div>
    <div class="form-group">
      <label for="password">Password</label>
      <input type="password" id="password" name="password" required>
    </div>
    <button type="submit">Login</button>
  </form>
  <p><a href="/signup">Need an account? Sign up</a></p>
</div>
`;

// Enhanced templates object
export const templates = {
  login: () => {
    try {
      Logger.log('DEBUG', 'Rendering login template');
      const html = baseLayout('Login', loginForm);
      Logger.log('DEBUG', 'Login template rendered successfully');
      return html;
    } catch (error) {
      Logger.log('ERROR', 'Failed to render login template', { error });
      throw error;
    }
  },
  // ... other templates
};

// Error templates
export const errorTemplates = {
  serverError: (error: Error) => baseLayout('Error', `
    <div class="error-container">
      <h1>Server Error</h1>
      <p>${error.message}</p>
      <a href="/">Return Home</a>
    </div>
  `),
  notFound: () => baseLayout('Not Found', `
    <div class="error-container">
      <h1>Page Not Found</h1>
      <p>The requested page could not be found.</p>
      <a href="/">Return Home</a>
    </div>
  `)
};

// Enhanced render utility
export function renderTemplate(template: () => string): string {
  try {
    Logger.log('DEBUG', 'Starting template render');
    const html = template();
    Logger.log('DEBUG', 'Template render complete');
    return html;
  } catch (error) {
    Logger.log('ERROR', 'Template render failed', { error });
    return errorTemplates.serverError(error as Error);
  }
}

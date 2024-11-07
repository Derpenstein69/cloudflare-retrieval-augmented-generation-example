
import { sharedStyles, themeScript } from './shared';

export const loginTemplate = () => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Login | RusstCorp</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/water.css@2/out/water.css">
    ${sharedStyles}
  </head>
  <body>
    <div class="action-bar">
      <div class="title">RusstCorp</div>
      <div class="theme-toggle" onclick="toggleTheme()">🌓</div>
    </div>
    <div class="content">
      <h1>Login</h1>
      <form action="/login" method="POST">
        <input type="email" name="email" placeholder="Email" required>
        <input type="password" name="password" placeholder="Password" required>
        <button type="submit">Login</button>
      </form>
      <p>Don't have an account? <a href="/signup">Sign up</a></p>
    </div>
    ${themeScript}
  </body>
  </html>
`;

import { sharedStyles, themeScript } from './shared';

export const signupTemplate = () => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Sign Up | RusstCorp</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/water.css@2/out/water.css">
    ${sharedStyles}
  </head>
  <body>
    <div class="action-bar">
      <div class="title">RusstCorp</div>
      <div class="theme-toggle" onclick="toggleTheme()">🌓</div>
    </div>
    <div class="content">
      <h1>Sign Up</h1>
      <form action="/signup" method="POST">
        <input type="email" name="email" placeholder="Email" required>
        <input type="password" name="password" placeholder="Password" required>
        <input type="password" name="confirm_password" placeholder="Confirm Password" required>
        <button type="submit">Sign Up</button>
      </form>
      <p>Already have an account? <a href="/login">Login</a></p>
    </div>
    ${themeScript}
  </body>
  </html>
`;
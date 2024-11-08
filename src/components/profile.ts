import { sharedStyles, themeScript } from './shared'

export const profileTemplate = () => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Profile | RusstCorp</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/water.css@2/out/water.css">
  ${sharedStyles}
</head>
<body>
  <div class="action-bar">
    <div class="title">RusstCorp</div>
    <div class="theme-toggle" onclick="toggleTheme()">🌓</div>
  </div>
  <div class="content">
    <h1>Profile</h1>
    <form id="profile-form" method="POST" action="/profile">
      <div>
        <input type="text" name="display_name" placeholder="Display Name" required>
      </div>
      <div>
        <textarea name="bio" placeholder="Bio" required></textarea>
      </div>
      <button type="submit">Update Profile</button>
    </form>
  </div>
  ${themeScript}
</body>
</html>
`
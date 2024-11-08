import { sharedStyles, themeScript } from './shared'

export const settingsTemplate = () => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Settings | RusstCorp</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/water.css@2/out/water.css">
  ${sharedStyles}
</head>
<body>
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
  <div class="sidebar" id="sidebar">
    <div class="sidebar-item" onclick="loadContent('/notes')">Notes</div>
    <div class="sidebar-item" onclick="loadContent('/memory')">Memory</div>
  </div>
  <div class="content" id="content">
    <h1>Settings</h1>
    <div class="settings-container">
      <h1>Account Settings</h1>
      <form id="settings-form">
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" required>
        </div>
        <div class="form-group">
          <label for="current-password">Current Password</label>
          <input type="password" id="current-password" name="current_password">
        </div>
        <div class="form-group">
          <label for="new-password">New Password</label>
          <input type="password" id="new-password" name="new_password">
        </div>
        <div class="form-group">
          <label for="confirm-password">Confirm New Password</label>
          <input type="password" id="confirm-password" name="confirm_password">
        </div>
        <div>
          <label>Theme Preference</label>
          <select id="theme-select" onchange="updateThemePreference()">
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        <button type="submit">Save Changes</button>
      </form>
    </div>
  </div>
  ${themeScript}
  <script>
    document.getElementById('settings-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const response = await fetch('/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(Object.fromEntries(formData))
      });
      if (response.ok) {
        alert('Settings updated successfully');
      } else {
        alert('Failed to update settings');
      }
    });

    // Load current user data
    (async () => {
      const response = await fetch('/settings');
      if (response.ok) {
        const data = await response.json();
        document.getElementById('email').value = data.email;
      }
    })();

    document.addEventListener('DOMContentLoaded', () => {
      const savedTheme = localStorage.getItem('theme') || 'system';
      document.getElementById('theme-select').value = savedTheme;
    });

    function updateThemePreference() {
      const theme = document.getElementById('theme-select').value;
      setTheme(theme);
    }

    function toggleMenu() {
      const menu = document.getElementById('user-menu');
      menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }
    function toggleSidebar() {
      const sidebar = document.getElementById('sidebar');
      const content = document.getElementById('content');
      if (sidebar.style.display === 'none') {
        sidebar.style.display = 'block';
        content.classList.remove('collapsed');
      } else {
        sidebar.style.display = 'none';
        content.classList.add('collapsed');
      }
    }
    function goHome() {
      window.location.href = '/';
    }
  </script>
</body>
</html>
`
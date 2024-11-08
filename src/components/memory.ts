import { sharedStyles, themeScript } from './shared'

export const memoryTemplate = () => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Memory Manager | RusstCorp</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/water.css@2/out/water.css">
  ${sharedStyles}
</head>
<body>
  <div class="action-bar">
    <div class="menu-toggle" onclick="toggleSidebar()">☰</div>
    <div class="home-button" onclick="goHome()">🏠</div>
    <div class="title">Memory Manager</div>
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
    <h1>Memory Manager</h1>
    <div class="folders">
      <div class="folder" onclick="loadContent('/memory/work')">Work</div>
      <div class="folder" onclick="loadContent('/memory/personal')">Personal</div>
      <div class="folder" onclick="loadContent('/memory/family')">Family</div>
      <div class="folder" onclick="loadContent('/memory/private')">Private</div>
    </div>
  </div>
  ${themeScript}
  <script>
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
    // ...existing theme management and other scripts...
  </script>
</body>
</html>
`
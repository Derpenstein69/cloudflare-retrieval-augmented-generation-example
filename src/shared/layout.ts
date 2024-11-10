
import { sharedStyles, themeScript } from './styles';

// Base layout that all pages will use
export const baseLayout = (title: string, content: string, options: { showNav?: boolean } = {}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title} | RusstCorp</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/water.css@2/out/water.css">
  ${sharedStyles}
</head>
<body>
  ${options.showNav ? navigationBar() : simpleHeader()}
  ${content}
  ${themeScript}
  ${options.showNav ? commonScripts() : ''}
</body>
</html>
`;

const navigationBar = () => `
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
`;

const simpleHeader = () => `
  <div class="action-bar">
    <div class="title">RusstCorp</div>
    <div class="theme-toggle" onclick="toggleTheme()">🌓</div>
  </div>
`;

const commonScripts = () => `
  <script>
    // ... existing navigation and interaction scripts ...
  </script>
`;

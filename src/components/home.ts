
export const homeTemplate = () => `
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: var(--primary-color);
      color: var(--text-color);
    }
    .action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      background-color: var(--secondary-color);
      color: var(--text-color);
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
    }
    .title {
      text-align: center;
      flex-grow: 1;
    }
    .user-icon, .menu-toggle, .theme-toggle {
      cursor: pointer;
      position: relative;
    }
    .menu {
      display: none;
      position: absolute;
      right: 0;
      top: 100%;
      background-color: white;
      color: black;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .menu-item {
      padding: 10px;
      cursor: pointer;
    }
    .menu-item:hover {
      background-color: #f0f0f0;
    }
    .sidebar {
      width: 200px;
      background-color: var(--secondary-color);
      color: var(--text-color);
      position: fixed;
      top: 40px; /* Adjusted to be directly below the action bar */
      left: 0;
      height: calc(100% - 40px); /* Adjusted to account for the action bar height */
      padding: 0; /* Removed padding */
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
      margin-left: 0;
      transition: margin-left 0.3s;
    }
    .content.expanded {
      margin-left: 200px;
    }
    :root {
      --primary-color: white;
      --secondary-color: #d3d3d3;
      --text-color: black;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --primary-color: #1a1a1a;
        --secondary-color: #333;
        --text-color: white;
      }
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
  </style>
  <div class="action-bar">
    <div class="menu-toggle" onclick="toggleSidebar()">☰</div>
    <div class="title">RusstCorp</div>
    <div class="theme-toggle" onclick="toggleTheme()">🌓</div>
    <div class="user-icon" onclick="toggleMenu()">👤
      <ul class="menu" id="user-menu">
        <li class="menu-item" onclick="alert('Profile')">Profile</li>
        <li class="menu-item" onclick="alert('Settings')">Settings</li>
        <li class="menu-item" onclick="logout()">Logout</li>
      </ul>
    </div>
  </div>
  <div class="sidebar" id="sidebar">
    <div class="sidebar-item" onclick="location.href='/notes'">Notes</div>
  </div>
  <div class="content" id="content">
    <h1>Welcome to the Home Page</h1>
  </div>
  <script>
    function toggleMenu() {
      const menu = document.getElementById('user-menu');
      menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }
    function toggleSidebar() {
      const sidebar = document.getElementById('sidebar');
      const content = document.getElementById('content');
      if (sidebar.style.display === 'block') {
        sidebar.style.display = 'none';
        content.classList.remove('expanded');
      } else {
        sidebar.style.display = 'block';
        content.classList.add('expanded');
      }
    }
    // Theme management
    function getSystemTheme() {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function setTheme(theme) {
      const root = document.documentElement;
      root.classList.remove('light-mode', 'dark-mode');
      if (theme !== 'system') {
        root.classList.add(theme + '-mode');
      }
      localStorage.setItem('theme', theme);
      updateThemeToggleIcon(theme);
    }

    function updateThemeToggleIcon(theme) {
      const icon = document.querySelector('.theme-toggle');
      icon.textContent = theme === 'system' ? '🌓' : (theme === 'dark' ? '����' : '☀️');
    }

    function toggleTheme() {
      const currentTheme = localStorage.getItem('theme') || 'system';
      const themes = ['system', 'light', 'dark'];
      const nextIndex = (themes.indexOf(currentTheme) + 1) % themes.length;
      const newTheme = themes[nextIndex];
      setTheme(newTheme);
      
      if (newTheme === 'system') {
        // If system theme, apply the system preference
        const systemTheme = getSystemTheme();
        document.documentElement.classList.toggle('dark-mode', systemTheme === 'dark');
      }
    }

    // Initialize theme
    document.addEventListener('DOMContentLoaded', () => {
      const savedTheme = localStorage.getItem('theme') || 'system';
      setTheme(savedTheme);
      
      if (savedTheme === 'system') {
        const systemTheme = getSystemTheme();
        document.documentElement.classList.toggle('dark-mode', systemTheme === 'dark');
      }

      // Listen for system theme changes
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (localStorage.getItem('theme') === 'system') {
          document.documentElement.classList.toggle('dark-mode', e.matches);
        }
      });
    });

    async function logout() {
      await fetch('/logout', { method: 'POST' });
      window.location.href = '/login';
    }
    document.addEventListener('click', function(event) {
      const menu = document.getElementById('user-menu');
      if (!event.target.closest('.user-icon')) {
        menu.style.display = 'none';
      }
    });
  </script>
`;
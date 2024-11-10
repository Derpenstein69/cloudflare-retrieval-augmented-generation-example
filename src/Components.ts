// Shared styles and theme script that was previously in shared.ts
export const sharedStyles = `
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: var(--primary-color);
      color: var(--text-color);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .content {
      background-color: var(--secondary-color);
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
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
      background-color: var(--secondary-color);
      color: var(--text-color);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      list-style: none;
      padding: 0;
      margin: 0;
      min-width: 150px;
    }
    .menu-item {
      padding: 10px;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .menu-item:hover {
      background-color: var(--primary-color);
    }
    .sidebar {
      width: 200px;
      background-color: var(--secondary-color);
      color: var(--text-color);
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
      background-color: var(--secondary-color);
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .folder:hover {
      background-color: var(--primary-color);
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
`;

export const themeScript = `
  <script>
    try {
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
        switch(theme) {
          case 'system':
            icon.textContent = '🌓';
            break;
          case 'dark':
            icon.textContent = '🌙';
            break;
          case 'light':
            icon.textContent = '☀️';
            break;
        }
      }

      function toggleTheme() {
        const currentTheme = localStorage.getItem('theme') || 'system';
        const themes = ['system', 'light', 'dark'];
        const nextIndex = (themes.indexOf(currentTheme) + 1) % themes.length;
        const newTheme = themes[nextIndex];
        setTheme(newTheme);

        if (newTheme === 'system') {
          const systemTheme = getSystemTheme();
          document.documentElement.classList.toggle('dark-mode', systemTheme === 'dark');
        }
      }

      document.addEventListener('DOMContentLoaded', () => {
        try {
          const savedTheme = localStorage.getItem('theme') || 'system';
          setTheme(savedTheme);

          if (savedTheme === 'system') {
            const systemTheme = getSystemTheme();
            document.documentElement.classList.toggle('dark-mode', systemTheme === 'dark');
          }
        } catch (err) {
          console.error('Theme initialization error:', err);
          // Fallback to light theme
          document.documentElement.classList.add('light-mode');
        }
      });
    } catch (err) {
      console.error('Theme script error:', err);
    }
  </script>
`;

// Login template that was previously in login.ts
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
    <form id="login-form" method="POST" action="/auth/login">
      <div>
        <input type="email" name="email" placeholder="Email" required>
      </div>
      <div>
        <input type="password" name="password" placeholder="Password" required>
      </div>
      <button type="submit">Login</button>
    </form>
    <p>Don't have an account? <a href="/signup">Sign up</a></p>
  </div>
  ${themeScript}
</body>
</html>
`;

// Signup template that was previously in signup.ts
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
      <form id="signup-form" action="/auth/signup" method="POST">
        <input type="email" name="email" placeholder="Email" required>
        <input type="password" name="password" placeholder="Password" minlength="8" required>
        <input type="password" name="confirm_password" placeholder="Confirm Password" minlength="8" required>
        <button type="submit">Sign Up</button>
      </form>
      <p>Already have an account? <a href="/login">Login</a></p>
    </div>
    ${themeScript}
  </body>
  </html>
`;

// Home template that was previously in home.ts
export const homeTemplate = () => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Home | RusstCorp</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/water.css@2/out/water.css">
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
    .user-icon, .menu-toggle, .theme-toggle, .home-button {
      cursor: pointer;
      position: relative;
    }
    .menu {
      display: none;
      position: absolute;
      right: 0;
      top: 100%;
      background-color: var(--secondary-color);
      color: var(--text-color);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      list-style: none;
      padding: 0;
      margin: 0;
      min-width: 150px;
    }
    .menu-item {
      padding: 10px;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .menu-item:hover {
      background-color: var(--primary-color);
    }
    .sidebar {
      width: 200px;
      background-color: var(--secondary-color);
      color: var(--text-color);
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
    <h1>RusstCorp - Complexity Simplified, with a side of style</h1>
  </div>
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
      // Fixed the icon characters
      switch(theme) {
        case 'system':
          icon.textContent = '🌓';
          break;
        case 'dark':
          icon.textContent = '🌙';
          break;
        case 'light':
          icon.textContent = '☀️';
          break;
      }
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
      try {
        const response = await fetch('/auth/logout', { // Use the correct path for logout
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          window.location.href = '/login';
        } else {
          console.error('Logout failed:', await response.text());
          alert('Failed to logout. Please try again.');
          return false;
        }
      } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to logout. Please try again.');
        return false;
      }
      return true;
    }

    async function handleLogout() {
      if (await logout()) {
        toggleMenu();
      }
    }

    document.addEventListener('click', function(event) {
      const menu = document.getElementById('user-menu');
      const userIcon = event.target.closest('.user-icon');
      const menuItem = event.target.closest('.menu-item');

      if (!userIcon && !menuItem) {
        menu.style.display = 'none';
      }
    });

    async function loadContent(path) {
      try {
        const response = await fetch(path);
        if (response.status === 302 || response.status === 401) {
          window.location.href = '/login';
          return;
        }
        if (!response.ok) {
          throw new Error('HTTP error! status: ' + response.status);
        }
        const html = await response.text();
        document.getElementById('content').innerHTML = html;
        history.pushState(null, '', path);
        return true;
      } catch (error) {
        console.error('Content loading error:', error);
        alert('Failed to load content. Please try again.');
        return false;
      }
    }

    // Handle browser back/forward buttons
    window.onpopstate = () => {
      loadContent(window.location.pathname);
    }
  </script>
</body>
</html>
`;

// Profile template that was previously in profile.ts
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
`;

// Settings template that was previously in settings.ts
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
`;

// Notes template that was previously in notes.ts
export const notesTemplate = () => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Notes | RusstCorp</title>
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
    <h1>Notes</h1>
    <div>
      <h2>Notes</h2>
      <div id="notes-list">
        Loading notes...
      </div>
      <form id="note-form" onsubmit="handleNoteSubmit(event)">
        <textarea name="text" required placeholder="Enter your note"></textarea>
        <button type="submit">Save Note</button>
      </form>
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
    async function loadNotes() {
      try {
        const response = await fetch('/notes.json'); // Fetch notes from the correct path
        if (!response.ok) throw new Error('Failed to load notes');
        const notes = await response.json();
        document.getElementById('notes-list').innerHTML = notes.length ?
          notes.map(note => \`<div class="note">\${note.text}</div>\`).join('') :
          '<p>No notes yet</p>';
      } catch (error) {
        console.error('Error loading notes:', error);
        document.getElementById('notes-list').innerHTML = '<p>Error loading notes</p>';
      }
    }

    async function handleNoteSubmit(event) {
      event.preventDefault();
      const form = event.target;
      try {
        const response = await fetch('/notes', { // Use the correct path for creating notes
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: form.text.value })
        });
        if (!response.ok) throw new Error('Failed to save note');
        form.reset();
        await loadNotes();
      } catch (error) {
        console.error('Error saving note:', error);
        alert('Failed to save note');
      }
    }

    loadNotes();
  </script>
</body>
</html>
`;

// Memory template that was previously in memory.ts
export const memoryTemplate = () => {
  const folderTemplate = (name: string) => `
    <div class="folder-edit-menu">
      <button class="folder-edit-button" onclick="deleteFolder(this)">Delete</button>
      <button class="folder-edit-button" onclick="toggleFolderNameEdit(this)">Change Name</button>
      <button class="folder-edit-button" onclick="togglePrivate(this)">Make Private</button>
      <button class="folder-edit-button" onclick="editSettings(this)">Edit Settings</button>
    </div>
    <p class="folder-name">${name}</p>
    <input type="text" class="folder-name-edit" value="${name}">
  `;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Memory Manager | RusstCorp</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/water.css@2/out/water.css">
  ${sharedStyles}
  <style>
    .memory-menu-bar {
      display: flex;
      justify-content: flex-start;
      gap: 20px;
      padding: 1rem;
      background-color: var(--secondary-color);
      margin: 60px 0 20px 200px;  /* Top margin accounts for action-bar */
      border-radius: 8px;
    }

    .memory-menu-button {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      background-color: var(--primary-color);
      color: var(--text-color);
      cursor: pointer;
    }

    .memory-menu-button:hover {
      opacity: 0.9;
    }

    .memory-container {
      margin: 20px 20px 20px 200px;
      padding: 2rem;
      background-color: var(--secondary-color);
      border-radius: 8px;
      min-height: calc(100vh - 180px);  /* Adjust for action-bar, menu-bar, and margins */
    }

    /* Adjust when sidebar is collapsed */
    .content.collapsed .memory-menu-bar {
      margin-left: 20px;
    }

    .content.collapsed .memory-container {
      margin-left: 20px;
    }

    .folder-edit-menu {
      display: none;
      position: absolute;
      top: -40px;
      left: 0;
      right: 0;
      background-color: var(--secondary-color);
      padding: 8px;
      border-radius: 4px 4px 0 0;
      box-shadow: 0 -2px 4px rgba(0,0,0,0.1);
    }

    .folder-edit-button {
      padding: 4px 8px;
      margin: 0 4px;
      border: none;
      border-radius: 3px;
      background-color: var(--primary-color);
      color: var(--text-color);
      cursor: pointer;
      font-size: 0.8em;
    }

    .folder {
      position: relative;
      min-width: 120px;
      text-align: center;
    }

    .folder.private {
      opacity: 0.6;
    }

    .folder-name {
      margin: 0;
      padding: 4px;
    }

    .folder-name-edit {
      display: none;
      width: 90%;
      margin: 4px auto;
      padding: 2px;
      border: 1px solid var(--text-color);
      border-radius: 3px;
    }
  </style>
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
    <div class="memory-menu-bar">
      <button class="memory-menu-button" onclick="addFolder()">Add Folder</button>
      <button class="memory-menu-button" onclick="editLayout()">Edit Layout</button>
      <button class="memory-menu-button" onclick="addKnowledge()">Add Knowledge</button>
    </div>
    <div class="memory-container">
      <h1>Memory Manager</h1>
      <div class="folders">
        <div class="folder" onclick="loadContent('/memory/work')">${folderTemplate('Work')}</div>
        <div class="folder" onclick="loadContent('/memory/personal')">${folderTemplate('Personal')}</div>
        <div class="folder" onclick="loadContent('/memory/family')">${folderTemplate('Family')}</div>
        <div class="folder" onclick="loadContent('/memory/private')">${folderTemplate('Private')}</div>
      </div>
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
    function addFolder() {
      const foldersDiv = document.querySelector('.folders');
      const newFolder = document.createElement('div');
      const folderName = 'New Folder';

      newFolder.className = 'folder';
      newFolder.innerHTML = \`${folderTemplate('New Folder')}\`;

      foldersDiv.appendChild(newFolder);
    }

    function editLayout() {
      const folders = document.querySelectorAll('.folder');
      folders.forEach(folder => {
        const menu = folder.querySelector('.folder-edit-menu');
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
      });
    }

    function deleteFolder(button) {
      if (confirm('Are you sure you want to delete this folder?')) {
        button.closest('.folder').remove();
      }
    }

    function toggleFolderNameEdit(button) {
      const folder = button.closest('.folder');
      const nameP = folder.querySelector('.folder-name');
      const nameInput = folder.querySelector('.folder-name-edit');

      if (nameInput.style.display === 'block') {
        nameP.textContent = nameInput.value;
        nameP.style.display = 'block';
        nameInput.style.display = 'none';
      } else {
        nameInput.style.display = 'block';
        nameP.style.display = 'none';
        nameInput.focus();
      }
    }

    function togglePrivate(button) {
      const folder = button.closest('.folder');
      const isPrivate = folder.classList.toggle('private');
      button.textContent = isPrivate ? 'Make Public' : 'Make Private';
    }

    function editSettings(button) {
      // TODO: Implement settings logic
      console.log('Edit settings clicked');
    }

    function addKnowledge() {
      // TODO: Implement knowledge addition
      console.log('Add knowledge clicked');
    }

    // Add event listener for folder rename on Enter key
    function setupFolderRenameListeners() {
      document.querySelectorAll('.folder-name-edit').forEach(input => {
        input.addEventListener('keyup', (e) => {
          if (e.key === 'Enter') {
            const folder = input.closest('.folder');
            const nameP = folder.querySelector('.folder-name');
            nameP.textContent = input.value;
            nameP.style.display = 'block';
            input.style.display = 'none';
          }
        });
      });
    }

    // Add click handler to prevent folder navigation during edit mode
    function handleFolderClick(e) {
      if (e.target.closest('.folder-edit-menu')) {
        e.stopPropagation();
      }
    }

    // Initialize after DOM loads
    document.addEventListener('DOMContentLoaded', () => {
      setupFolderRenameListeners();
      document.querySelector('.folders').addEventListener('click', handleFolderClick, true);
    });
  </script>
</body>
</html>
`};

// Export templates object
export const templates = {
  login: loginTemplate,
  signup: signupTemplate,
  home: homeTemplate,
  profile: profileTemplate,
  settings: settingsTemplate,
  notes: notesTemplate,
  memory: memoryTemplate
};

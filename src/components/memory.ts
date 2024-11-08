import { sharedStyles, themeScript } from './shared'

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
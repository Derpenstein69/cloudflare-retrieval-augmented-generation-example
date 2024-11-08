import { sharedStyles, themeScript } from './shared'

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
`
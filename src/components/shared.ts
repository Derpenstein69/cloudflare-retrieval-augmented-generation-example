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
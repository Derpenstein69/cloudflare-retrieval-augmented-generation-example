export const settingsTemplate = () => `
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
  </script>
`;
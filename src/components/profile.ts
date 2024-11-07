export const profileTemplate = () => `
  <div class="profile-container">
    <h1>Profile</h1>
    <form id="profile-form">
      <div class="form-group">
        <label for="display-name">Display Name</label>
        <input type="text" id="display-name" name="display_name">
      </div>
      <div class="form-group">
        <label for="bio">Bio</label>
        <textarea id="bio" name="bio" rows="4"></textarea>
      </div>
      <button type="submit">Save Changes</button>
    </form>
  </div>
  <script>
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const response = await fetch('/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(Object.fromEntries(formData))
      });
      if (response.ok) {
        alert('Profile updated successfully');
      } else {
        alert('Failed to update profile');
      }
    });

    // Load current profile data
    (async () => {
      const response = await fetch('/profile');
      if (response.ok) {
        const data = await response.json();
        document.getElementById('display-name').value = data.display_name || '';
        document.getElementById('bio').value = data.bio || '';
      }
    })();
  </script>
`;
import { Hono } from 'hono'
import { verify } from 'hono/jwt'
import { getCookie } from 'hono/cookie'
import { hashPassword } from '../utils'
import type { Env } from '../types'

const settings = new Hono<{ Bindings: Env }>()

settings.get('/settings/account', async (c) => {
  const token = getCookie(c, 'token');
  const jwtSecret = await c.env.USERS_KV.get('JWT_SECRET');
  const payload = await verify(token!, jwtSecret!);
  const email = payload.email;

  return c.html(`
    <style>
      .settings-container {
        padding: 20px;
        max-width: 600px;
        margin: 0 auto;
      }
      .settings-section {
        margin-bottom: 30px;
        padding: 20px;
        border: 1px solid var(--secondary-color);
        border-radius: 8px;
      }
      .settings-title {
        margin-bottom: 20px;
        color: var(--text-color);
      }
      .form-group {
        margin-bottom: 15px;
      }
      .form-group label {
        display: block;
        margin-bottom: 5px;
        color: var(--text-color);
      }
      .form-group input {
        width: 100%;
        padding: 8px;
        border: 1px solid var(--secondary-color);
        border-radius: 4px;
        background: var(--primary-color);
        color: var(--text-color);
      }
      .danger-zone {
        border-color: #ff4444;
      }
      .danger-button {
        background: #ff4444;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
      }
      .save-button {
        background: #4CAF50;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
      }
      .error-message {
        color: #ff4444;
        margin-top: 5px;
        display: none;
      }
    </style>
    <div class="settings-container">
      <h1 class="settings-title">Account Settings</h1>
      
      <div class="settings-section">
        <h2>Change Email</h2>
        <form id="emailForm">
          <div class="form-group">
            <label>Current Email: ${email}</label>
          </div>
          <div class="form-group">
            <label for="newEmail">New Email</label>
            <input type="email" id="newEmail" required>
          </div>
          <div class="form-group">
            <label for="confirmPassword">Confirm Password</label>
            <input type="password" id="confirmPassword" required>
          </div>
          <button type="submit" class="save-button">Update Email</button>
          <div class="error-message" id="emailError"></div>
        </form>
      </div>

      <div class="settings-section">
        <h2>Change Password</h2>
        <form id="passwordForm">
          <div class="form-group">
            <label for="currentPassword">Current Password</label>
            <input type="password" id="currentPassword" required>
          </div>
          <div class="form-group">
            <label for="newPassword">New Password</label>
            <input type="password" id="newPassword" required minlength="8">
          </div>
          <button type="submit" class="save-button">Update Password</button>
          <div class="error-message" id="passwordError"></div>
        </form>
      </div>

      <div class="settings-section danger-zone">
        <h2>Danger Zone</h2>
        <p>Once you delete your account, there is no going back. Please be certain.</p>
        <button onclick="deleteAccount()" class="danger-button">Delete Account</button>
        <div class="error-message" id="deleteError"></div>
      </div>
    </div>
    <script>
      document.getElementById('emailForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const error = document.getElementById('emailError');
        error.style.display = 'none';
        
        try {
          const response = await fetch('/settings/account/email', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              newEmail: document.getElementById('newEmail').value,
              password: document.getElementById('confirmPassword').value
            })
          });
          
          if (response.ok) {
            window.location.reload();
          } else {
            const text = await response.text();
            error.textContent = text;
            error.style.display = 'block';
          }
        } catch (err) {
          error.textContent = 'An error occurred';
          error.style.display = 'block';
        }
      });

      document.getElementById('passwordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const error = document.getElementById('passwordError');
        error.style.display = 'none';
        
        try {
          const response = await fetch('/settings/account/password', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              currentPassword: document.getElementById('currentPassword').value,
              newPassword: document.getElementById('newPassword').value
            })
          });
          
          if (response.ok) {
            document.getElementById('passwordForm').reset();
            alert('Password updated successfully');
          } else {
            const text = await response.text();
            error.textContent = text;
            error.style.display = 'block';
          }
        } catch (err) {
          error.textContent = 'An error occurred';
          error.style.display = 'block';
        }
      });

      async function deleteAccount() {
        if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
          return;
        }
        
        const error = document.getElementById('deleteError');
        error.style.display = 'none';
        
        try {
          const response = await fetch('/settings/account', {
            method: 'DELETE'
          });
          
          if (response.ok) {
            window.location.href = '/logout';
          } else {
            const text = await response.text();
            error.textContent = text;
            error.style.display = 'block';
          }
        } catch (err) {
          error.textContent = 'An error occurred';
          error.style.display = 'block';
        }
      }
    </script>
  `);
});

settings.put('/settings/account/email', async (c) => {
  const { newEmail, password } = await c.req.json();
  const token = getCookie(c, 'token');
  const jwtSecret = await c.env.USERS_KV.get('JWT_SECRET');
  const payload = await verify(token!, jwtSecret!);
  const currentEmail = payload.email;

  // Verify password
  const userStr = await c.env.USERS_KV.get(currentEmail);
  const user = JSON.parse(userStr!);
  const hashedPassword = await hashPassword(password);
  if (hashedPassword !== user.password) {
    return c.text('Invalid password', 401);
  }

  // Update email
  user.email = newEmail;
  await c.env.USERS_KV.delete(currentEmail);
  await c.env.USERS_KV.put(newEmail, JSON.stringify(user));
  return c.text('Email updated');
});

settings.put('/settings/account/password', async (c) => {
  const { currentPassword, newPassword } = await c.req.json();
  const token = getCookie(c, 'token');
  const jwtSecret = await c.env.USERS_KV.get('JWT_SECRET');
  const payload = await verify(token!, jwtSecret!);
  const email = payload.email;

  const userStr = await c.env.USERS_KV.get(email);
  const user = JSON.parse(userStr!);
  
  const hashedCurrentPassword = await hashPassword(currentPassword);
  if (hashedCurrentPassword !== user.password) {
    return c.text('Current password is incorrect', 401);
  }

  user.password = await hashPassword(newPassword);
  await c.env.USERS_KV.put(email, JSON.stringify(user));
  return c.text('Password updated');
});

settings.delete('/settings/account', async (c) => {
  const token = getCookie(c, 'token');
  const jwtSecret = await c.env.USERS_KV.get('JWT_SECRET');
  const payload = await verify(token!, jwtSecret!);
  const email = payload.email;

  await c.env.USERS_KV.delete(email);
  return c.text('Account deleted');
});

export default settings;

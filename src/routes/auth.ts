
import { Hono } from 'hono'
import { jwt } from 'hono/jwt'
import { setCookie } from 'hono/cookie'
import { hashPassword, verifyPassword, generateSecureKey } from '../utils'
import type { Env } from '../types'

const auth = new Hono<{ Bindings: Env }>()

auth.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) return c.text("Missing email or password", 400);

  try {
    const userStr = await c.env.USERS_KV.get(email);
    if (!userStr) {
      return c.text("Invalid email or password", 401);
    }

    const user = JSON.parse(userStr);
    const isValid = await verifyPassword(password, user.password);
    
    if (!isValid) {
      return c.text("Invalid email or password", 401);
    }

    // Get or generate JWT secret
    let jwtSecret = await c.env.USERS_KV.get('JWT_SECRET');
    if (!jwtSecret) {
      jwtSecret = generateSecureKey(64);
      await c.env.USERS_KV.put('JWT_SECRET', jwtSecret);
    }

    const token = await jwt.sign({ email }, jwtSecret, { expiresIn: '1h' });
    setCookie(c, 'token', token, {
      httpOnly: true,
      secure: true,
      path: '/',
      sameSite: 'Strict'
    });

    return c.text("Login successful", 200);
  } catch (err) {
    console.error('Login error:', err);
    return c.text("An error occurred during login", 500);
  }
})

auth.get('/login', async (c) => {
  return c.html(`
    <style>
      .login-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        gap: 20px;
      }
      .form-group {
        display: flex;
        flex-direction: column;
        width: 100%;
        max-width: 300px;
        gap: 5px;
      }
      .signup-link {
        margin-top: 10px;
        text-align: center;
      }
      .error-message {
        color: red;
        margin-top: 10px;
        display: none;
      }
    </style>
    <div class="login-container">
      <form id="loginForm">
        <div class="form-group">
          <label for="email">Email:</label>
          <input type="email" id="email" name="email" required>
        </div>
        <div class="form-group">
          <label for="password">Password:</label>
          <input type="password" id="password" name="password" required>
        </div>
        <div class="form-group">
          <button type="submit">Login</button>
        </div>
        <div class="error-message" id="errorMessage"></div>
        <div class="signup-link">
          <a href="/signup">Don't have an account? Sign up</a>
        </div>
      </form>
    </div>
    <script>
      document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.style.display = 'none';
        
        try {
          const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: document.getElementById('email').value,
              password: document.getElementById('password').value
            })
          });
          
          if (response.ok) {
            window.location.href = '/';
          } else {
            const error = await response.text();
            errorMessage.textContent = error;
            errorMessage.style.display = 'block';
          }
        } catch (err) {
          errorMessage.textContent = 'An error occurred. Please try again.';
          errorMessage.style.display = 'block';
        }
      });
    </script>
  `);
})

auth.post('/signup', async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) return c.text("Missing email or password", 400);
    if (password.length < 8) return c.text("Password must be at least 8 characters", 400);

    const existing = await c.env.USERS_KV.get(email);
    if (existing) {
      return c.text("Email already registered", 400);
    }

    const hashedPassword = await hashPassword(password);
    const user = { email, password: hashedPassword };
    await c.env.USERS_KV.put(email, JSON.stringify(user));

    // Ensure JWT secret exists
    let jwtSecret = await c.env.USERS_KV.get('JWT_SECRET');
    if (!jwtSecret) {
      jwtSecret = generateSecureKey(64);
      await c.env.USERS_KV.put('JWT_SECRET', jwtSecret);
    }

    const token = await jwt.sign({ email }, jwtSecret, { expiresIn: '1h' });
    setCookie(c, 'token', token, {
      httpOnly: true,
      secure: true,
      path: '/',
      sameSite: 'Strict'
    });

    return c.text("Signup successful", 201);
  } catch (err) {
    console.error('Signup error:', err);
    return c.text("An error occurred during signup", 500);
  }
})

auth.get('/signup', async (c) => {
  return c.html(`
    <style>
      .login-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        gap: 20px;
      }
      .form-group {
        display: flex;
        flex-direction: column;
        width: 100%;
        max-width: 300px;
        gap: 5px;
      }
      .login-link {
        margin-top: 10px;
        text-align: center;
      }
      .error-message {
        color: red;
        margin-top: 10px;
        display: none;
      }
    </style>
    <div class="login-container">
      <form id="signupForm">
        <div class="form-group">
          <label for="email">Email:</label>
          <input type="email" id="email" name="email" required>
        </div>
        <div class="form-group">
          <label for="password">Password:</label>
          <input type="password" id="password" name="password" required minlength="6">
        </div>
        <div class="form-group">
          <button type="submit">Sign up</button>
        </div>
        <div class="error-message" id="errorMessage"></div>
        <div class="login-link">
          <a href="/login">Already have an account? Login</a>
        </div>
      </form>
    </div>
    <script>
      document.getElementById('signupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.style.display = 'none';
        
        try {
          const response = await fetch('/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: document.getElementById('email').value,
              password: document.getElementById('password').value
            })
          });
          
          if (response.ok) {
            window.location.href = '/';
          } else {
            const error = await response.text();
            errorMessage.textContent = error;
            errorMessage.style.display = 'block';
          }
        } catch (err) {
          errorMessage.textContent = 'An error occurred. Please try again.';
          errorMessage.style.display = 'block';
        }
      });
    </script>
  `);
})

auth.post('/logout', async (c) => {
  setCookie(c, 'token', '', {
    httpOnly: true,
    secure: true,
    path: '/',
    maxAge: 0
  });
  return c.redirect('/login');
})

export default auth
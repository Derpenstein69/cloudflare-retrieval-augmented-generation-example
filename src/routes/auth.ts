import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { sign, verify } from 'hono/jwt'
import { hashPassword, generateSecureKey } from '../utils'
import { loginTemplate } from '../components/login'
import { signupTemplate } from '../components/signup'
import type { Env } from '../types'

const auth = new Hono<{ Bindings: Env }>()

// Add method not allowed handler
auth.all('/login', async (c) => {
  if (c.req.method !== 'POST') {
    return c.text('Method not allowed', 405);
  }
  try {
    const formData = await c.req.parseBody();
    const { email, password } = formData;
    
    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    const userData = await c.env.USERS_KV.get(email);
    if (!userData) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const user = JSON.parse(userData);
    const hashedPassword = await hashPassword(password as string);
    
    if (user.password !== hashedPassword) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const token = sign({ email }, 'your-secret-key', { expiresIn: '24h' });

    setCookie(c, 'session', token, {
      httpOnly: true,
      secure: true,
      path: '/',
      sameSite: 'Strict',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return c.redirect('/');
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
})

auth.all('/signup', async (c) => {
  if (c.req.method !== 'POST') {
    return c.text('Method not allowed', 405);
  }
  try {
    const formData = await c.req.parseBody();
    const { email, password, confirm_password } = formData;
    
    if (!email || !password) {
      return c.json({ error: "Missing email or password" }, 400);
    }
    
    if (password !== confirm_password) {
      return c.json({ error: "Passwords do not match" }, 400);
    }

    if (typeof password === 'string' && password.length < 8) {
      return c.json({ error: "Password must be at least 8 characters" }, 400);
    }

    const existing = await c.env.USERS_KV.get(email as string);
    if (existing) {
      return c.json({ error: "Email already registered" }, 400);
    }

    const hashedPassword = await hashPassword(password as string);
    const user = { email, password: hashedPassword };
    await c.env.USERS_KV.put(email as string, JSON.stringify(user));

    const token = sign({ email }, 'your-secret-key', { expiresIn: '24h' });

    setCookie(c, 'session', token, {
      httpOnly: true,
      secure: true,
      path: '/',
      sameSite: 'Strict',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return c.redirect('/');
  } catch (err) {
    console.error('Signup error:', err);
    return c.json({ error: "An error occurred during signup" }, 500);
  }
})

auth.post('/logout', async (c) => {
  deleteCookie(c, 'session', { path: '/' });
  return c.json({ message: 'Logged out successfully' });
});

// Add a catch-all route for unhandled paths
auth.all('*', async (c) => {
  return c.text('Not found', 404);
})

export default auth
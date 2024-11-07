import { Hono } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { sign } from 'hono/jwt'  // Changed this line
import { hashPassword, generateSecureKey } from '../utils'
import { loginTemplate } from '../components/login'
import { signupTemplate } from '../components/signup'
import type { Env } from '../types'

const auth = new Hono<{ Bindings: Env }>()

auth.post('/login', async (c) => {
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

    const sessionId = generateSecureKey();
    const sessionDOId = c.env.SESSIONS_DO.idFromName(sessionId);
    const sessionDO = c.env.SESSIONS_DO.get(sessionDOId);
    
    await sessionDO.fetch(new Request('https://dummy-url/save', {
      method: 'POST',
      body: email as string
    }));

    setCookie(c, 'session', sessionId, {
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
});

// Remove the GET handlers since they're now in index.ts
auth.post('/signup', async (c) => {
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

    // Create session with proper DO ID
    const sessionId = generateSecureKey();
    const sessionDOId = c.env.SESSIONS_DO.idFromName(sessionId);
    const sessionDO = c.env.SESSIONS_DO.get(sessionDOId);
    
    // Save the email in the session
    await sessionDO.fetch(new Request('https://dummy-url/save', {
      method: 'POST',
      body: email as string
    }));

    setCookie(c, 'session', sessionId, {
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
  try {
    const sessionId = getCookie(c, 'session');
    if (sessionId) {
      await c.env.SESSIONS_DO.get(sessionId).then(async (obj) => {
        if (obj) {
          await c.env.SESSIONS_DO.delete(sessionId);
        }
      });

      setCookie(c, 'session', '', {
        httpOnly: true,
        secure: true,
        path: '/',
        maxAge: 0
      });
    }
    return c.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return c.json({ error: 'Failed to logout' }, 500);
  }
});

export default auth
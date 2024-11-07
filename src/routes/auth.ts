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
    try {
      await c.env.SESSIONS_DO.get(sessionId).then(obj => obj.save(email));
    } catch (error) {
      console.error('Session creation error:', error);
      return c.json({ error: 'Failed to create session' }, 500);
    }

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

auth.get('/login', (c) => {
  return c.html(loginTemplate())
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
    console.log('Signup: Storing hashed password:', hashedPassword); // Debug log
    const user = { email, password: hashedPassword };
    await c.env.USERS_KV.put(email, JSON.stringify(user));

    // Ensure JWT secret exists
    let jwtSecret = await c.env.USERS_KV.get('JWT_SECRET');
    if (!jwtSecret) {
      jwtSecret = generateSecureKey(64);
      await c.env.USERS_KV.put('JWT_SECRET', jwtSecret);
    }

    // Changed jwt.sign to sign
    const token = await sign({ email }, jwtSecret);
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

auth.get('/signup', (c) => {
  return c.html(signupTemplate())
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
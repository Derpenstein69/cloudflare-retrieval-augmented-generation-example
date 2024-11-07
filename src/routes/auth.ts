import { Hono } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { sign } from 'hono/jwt'  // Changed this line
import { hashPassword, generateSecureKey } from '../utils'
import { loginTemplate } from '../components/login'
import { signupTemplate } from '../components/signup'
import type { Env } from '../types'

const auth = new Hono<{ Bindings: Env }>()

auth.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) return c.text("Missing email or password", 400);

  try {
    // Debug: Log email being searched
    console.log('Attempting login for email:', email);

    const userStr = await c.env.USERS_KV.get(email);
    if (!userStr) {
      console.log('User not found in KV store');
      return c.text("Invalid email or password", 401);
    }

    // Debug: Log stored user data (without password)
    const user = JSON.parse(userStr);
    console.log('Found user:', { email: user.email });

    // If the stored password is not hashed (legacy data), update it
    if (!user.password.includes('=')) { // Simple check for base64 encoding
      console.log('Converting legacy password to hashed format');
      const hashedPassword = await hashPassword(user.password);
      user.password = hashedPassword;
      await c.env.USERS_KV.put(email, JSON.stringify(user));
    }

    const hashedInputPassword = await hashPassword(password);
    console.log('Password comparison:', {
      storedLength: user.password.length,
      inputLength: hashedInputPassword.length,
      matches: hashedInputPassword === user.password
    });

    const isValid = hashedInputPassword === user.password;
    
    if (!isValid) {
      console.log('Password verification failed');
      return c.text("Invalid email or password", 401);
    }

    // Get or generate JWT secret
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

    const sessionId = generateSecureKey();
    setCookie(c, 'session', sessionId, {
      httpOnly: true,
      secure: true,
      path: '/'
    });

    return c.text("Login successful", 200);
  } catch (err) {
    console.error('Login error:', err);
    return c.text("An error occurred during login", 500);
  }
})

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
  const sessionId = getCookie(c, 'session');
  if (sessionId) {
    // Clear the session from DO
    await c.env.SESSIONS_DO.get(sessionId).then(async (obj) => {
      if (obj) {
        await c.env.SESSIONS_DO.delete(sessionId);
      }
    });

    // Clear the cookie
    setCookie(c, 'session', '', {
      httpOnly: true,
      secure: true,
      path: '/',
      maxAge: 0
    });
  }
  return c.json({ success: true });
});

export default auth
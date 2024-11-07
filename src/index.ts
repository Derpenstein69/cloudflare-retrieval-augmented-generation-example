import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { methodOverride } from 'hono/method-override'
import { jwt } from 'hono/jwt'
import { KVNamespace, DurableObjectNamespace } from 'cloudflare:workers'
import { getCookie, setCookie } from 'hono/cookie'

// @ts-expect-error
import notes from './notes.html'
// @ts-expect-error
import ui from './ui.html'
// @ts-expect-error
import write from './write.html'

import { hashPassword, verifyPassword, generateSecureKey } from './utils';

type Env = {
  AI: Ai;
  DATABASE: D1Database;
  RAG_WORKFLOW: Workflow;
  VECTOR_INDEX: VectorizeIndex;
  JWT_SECRET: string;
  USERS_KV: KVNamespace;
  SESSIONS_DO: DurableObjectNamespace;
};

type Note = {
  id: string;
  text: string;
}

type Params = {
  text: string;
};

// Add this function at the start of the file
const validateEnv = (env: Env) => {
  if (!env.JWT_SECRET) throw new Error('JWT_SECRET is not set');
  if (!env.USERS_KV) throw new Error('USERS_KV is not configured');
};

const app = new Hono<{ Bindings: Env }>()
app.use(cors())

// Add error handling middleware
app.use('*', async (c, next) => {
  try {
    validateEnv(c.env);
    await next();
  } catch (err) {
    console.error('Environment error:', err);
    return c.text('Server configuration error', 500);
  }
});

app.get('/notes.json', async (c) => {
  const query = `SELECT * FROM notes`
  const { results } = await c.env.DATABASE.prepare(query).all()
  return c.json(results);
})

app.get('/notes', async (c) => {
  return c.html(notes);
})

app.use('/notes/:id', methodOverride({ app }))
app.delete('/notes/:id', async (c) => {
  const { id } = c.req.param();
  const query = `DELETE FROM notes WHERE id = ?`
  await c.env.DATABASE.prepare(query).bind(id).run()
  await c.env.VECTOR_INDEX.deleteByIds([id])
  return c.redirect('/notes')
})

app.post('/notes', async (c) => {
  const { text } = await c.req.json();
  if (!text) return c.text("Missing text", 400);
  await c.env.RAG_WORKFLOW.create({ params: { text } })
  return c.text("Created note", 201);
})

app.get('/ui', async (c) => {
  return c.html(ui);
})

app.get('/write', async (c) => {
  return c.html(write);
})

app.get('/query', async (c) => {
  const question = c.req.query('text') || "What is the square root of 9?"

  const embeddings = await c.env.AI.run('@cf/baai/bge-base-en-v1.5', { text: question })
  const vectors = embeddings.data[0]

  const vectorQuery = await c.env.VECTOR_INDEX.query(vectors, { topK: 1 });
  const vecId = vectorQuery.matches[0]?.id

  let notes: string[] = []
  if (vecId) {
    const query = `SELECT * FROM notes WHERE id = ?`
    const { results } = await c.env.DATABASE.prepare(query).bind(vecId).all<Note>()
    if (results) notes = results.map(note => note.text)
  }

  const contextMessage = notes.length
    ? `Context:\n${notes.map(note => `- ${note}`).join("\n")}`
    : ""

  const systemPrompt = `When answering the question or responding, use the context provided, if it is provided and relevant.`

  const response = await c.env.AI.run(
    "@cf/meta/llama-3.1-8b-instruct",
    {
      messages: [
        ...(notes.length ? [{ role: 'system', content: contextMessage }] : []),
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ] as RoleScopedChatInput[]
    }
  ) as AiTextGenerationOutput

  return response ? c.text((response as any).response) : c.text("We were unable to generate output", 500)
})

// Update checkAuth middleware to use the stored JWT secret
const checkAuth = async (c, next) => {
  const token = getCookie(c, 'token');
  if (!token) {
    return c.redirect('/login');
  }

  try {
    const jwtSecret = await c.env.USERS_KV.get('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT secret not found');
    }
    
    await jwt.verify(token, jwtSecret);
    await next();
  } catch (e) {
    return c.redirect('/login');
  }
};

app.get('/', checkAuth, async (c) => {
  return c.html(`
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: var(--primary-color);
        color: var(--text-color);
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
      .user-icon, .menu-toggle, .theme-toggle {
        cursor: pointer;
        position: relative;
      }
      .menu {
        display: none;
        position: absolute;
        right: 0;
        top: 100%;
        background-color: white;
        color: black;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .menu-item {
        padding: 10px;
        cursor: pointer;
      }
      .menu-item:hover {
        background-color: #f0f0f0;
      }
      .sidebar {
        width: 200px;
        background-color: var(--secondary-color);
        color: var(--text-color);
        position: fixed;
        top: 40px; /* Adjusted to be directly below the action bar */
        left: 0;
        height: calc(100% - 40px); /* Adjusted to account for the action bar height */
        padding: 0; /* Removed padding */
      }
      .sidebar-item {
        padding: 10px;
        cursor: pointer;
      }
      .sidebar-item:hover {
        background-color: #c0c0c0; /* Slightly darker grey for hover effect */
      }
      .content {
        margin-top: 50px; /* Adjusted to account for the action bar height */
        margin-left: 0;
        transition: margin-left 0.3s;
      }
      .content.expanded {
        margin-left: 200px;
      }
      :root {
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
    <div class="action-bar">
      <div class="menu-toggle" onclick="toggleSidebar()">☰</div>
      <div class="title">RusstCorp</div>
      <div class="theme-toggle" onclick="toggleTheme()">🌓</div>
      <div class="user-icon" onclick="toggleMenu()">👤
        <ul class="menu" id="user-menu">
          <li class="menu-item" onclick="alert('Profile')">Profile</li>
          <li class="menu-item" onclick="alert('Settings')">Settings</li>
          <li class="menu-item" onclick="logout()">Logout</li>
        </ul>
      </div>
    </div>
    <div class="sidebar" id="sidebar">
      <div class="sidebar-item" onclick="location.href='/notes'">Notes</div>
    </div>
    <div class="content" id="content">
      <h1>Welcome to the Home Page</h1>
    </div>
    <script>
      function toggleMenu() {
        const menu = document.getElementById('user-menu');
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
      }
      function toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const content = document.getElementById('content');
        if (sidebar.style.display === 'block') {
          sidebar.style.display = 'none';
          content.classList.remove('expanded');
        } else {
          sidebar.style.display = 'block';
          content.classList.add('expanded');
        }
      }
      function toggleTheme() {
        document.documentElement.classList.toggle('dark-mode');
      }
      async function logout() {
        await fetch('/logout', { method: 'POST' });
        window.location.href = '/login';
      }
      document.addEventListener('click', function(event) {
        const menu = document.getElementById('user-menu');
        if (!event.target.closest('.user-icon')) {
          menu.style.display = 'none';
        }
      });
    </script>
  `);
})

app.post('/login', async (c) => {
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

app.get('/login', async (c) => {
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

// Update the signup handler with better error handling
app.post('/signup', async (c) => {
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

app.get('/signup', async (c) => {
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

// Also add a logout route
app.post('/logout', async (c) => {
  setCookie(c, 'token', '', {
    httpOnly: true,
    secure: true,
    path: '/',
    maxAge: 0
  });
  return c.redirect('/login');
})

export class RAGWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const env = this.env
    const { text } = event.payload;

    const record = await step.do('create database record', async () => {
      const query = "INSERT INTO notes (text) VALUES (?) RETURNING *"

      const { results } = await env.DATABASE.prepare(query)
        .bind(text)
        .run<Note>()

      const record = results[0]
      if (!record) throw new Error("Failed to create note")
      return record;
    })

    const embedding = await step.do('generate embedding', async () => {
      const embeddings = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: text })
      const values = embeddings.data[0]
      if (!values) throw new Error("Failed to generate vector embedding")
      return values
    })

    await step.do('insert vector', async () => {
      return env.VECTOR_INDEX.upsert([
        {
          id: record.id.toString(),
          values: embedding,
        }
      ]);
    })
  }
}

export class SessionDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    // Handle session management
  }
}

export default app

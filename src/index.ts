import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { methodOverride } from 'hono/method-override'
import { jwt } from 'hono/jwt'
import { KVNamespace, DurableObjectNamespace } from 'cloudflare:workers'

// @ts-expect-error
import notes from './notes.html'
// @ts-expect-error
import ui from './ui.html'
// @ts-expect-error
import write from './write.html'

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

const app = new Hono<{ Bindings: Env }>()
app.use(cors())

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

const checkAuth = async (c, next) => {
  const token = c.req.cookies.get('token');
  if (!token) {
    return c.redirect('/login');
  }

  try {
    await jwt.verify(token, c.env.JWT_SECRET);
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
          <li class="menu-item" onclick="alert('Logout')">Logout</li>
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

  const user = await c.env.USERS_KV.get(email);
  if (!user || JSON.parse(user).password !== password) return c.text("Invalid email or password", 401);

  const token = await jwt.sign({ email }, c.env.JWT_SECRET, { expiresIn: '1h' });
  c.cookie('token', token, { httpOnly: true, secure: true });

  return c.text("Login successful", 200);
})

app.get('/login', async (c) => {
  return c.html(`
    <form method="POST" action="/login">
      <label for="email">Email:</label>
      <input type="email" id="email" name="email" required>
      <label for="password">Password:</label>
      <input type="password" id="password" name="password" required>
      <button type="submit">Login</button>
    </form>
  `);
})

app.post('/signup', async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) return c.text("Missing email or password", 400);

  const user = { email, password }; // Hash the password in a real implementation
  await c.env.USERS_KV.put(email, JSON.stringify(user));

  const token = await jwt.sign({ email }, c.env.JWT_SECRET, { expiresIn: '1h' });
  c.cookie('token', token, { httpOnly: true, secure: true });

  return c.text("Signup successful", 201);
})

app.get('/signup', async (c) => {
  return c.html(`
    <form method="POST" action="/signup">
      <label for="email">Email:</label>
      <input type="email" id="email" name="email" required>
      <label for="password">Password:</label>
      <input type="password" id="password" name="password" required>
      <button type="submit">Signup</button>
    </form>
  `);
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

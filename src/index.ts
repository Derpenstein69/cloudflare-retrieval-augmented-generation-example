import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { authMiddleware, validateEnv } from './middleware/auth'
import authRoutes from './routes/auth'
import notesRoutes from './routes/notes'
import profileRoutes from './routes/profile'
import settingsRoutes from './routes/settings'
import { homeTemplate } from './components/home'
import { loginTemplate } from './components/login'
import { signupTemplate } from './components/signup'
import type { Env } from './types'

const app = new Hono<{ Bindings: Env }>()

// Add error handling middleware
app.onError((err, c) => {
  console.error('Application error:', err);
  // Log the stack trace for better debugging
  if (err instanceof Error) {
    console.error('Stack trace:', err.stack);
  }
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Error - RusstCorp</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/water.css@2/out/water.css">
      </head>
      <body>
        <h1>Something went wrong</h1>
        <p>We're sorry, but something went wrong. Please try again later.</p>
        <a href="/">Return to Home</a>
        ${process.env.NODE_ENV === 'development' ? `<pre>${err}</pre>` : ''}
      </body>
    </html>
  `, 500);
});

// Add not found handler
app.notFound((c) => {
  console.log('404 Not Found:', c.req.path);
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>404 Not Found - RusstCorp</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/water.css@2/out/water.css">
      </head>
      <body>
        <h1>Page Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <a href="/">Return to Home</a>
      </body>
    </html>
  `, 404);
});

app.use(cors())

app.use('*', async (c, next) => {
  try {
    validateEnv(c.env);
    await next();
  } catch (err) {
    console.error('Environment error:', err);
    return c.text('Server configuration error', 500);
  }
});

// Middleware to check for session cookie
app.use('/*', async (c, next) => {
  const sessionCookie = getCookie(c, 'session');
  if (!sessionCookie) {
    console.log('No session cookie found, redirecting to login');
    return c.redirect('/login');
  }
  console.log('Session Cookie:', sessionCookie);
  await next();
});

// Login/Signup routes with error handling
app.get('/login', async (c) => {
  try {
    return c.html(loginTemplate())
  } catch (err) {
    console.error('Login template error:', err);
    throw err;
  }
})

app.get('/signup', async (c) => {
  try {
    console.log('Rendering signup template');
    const template = signupTemplate();
    console.log('Signup template rendered successfully');
    return c.html(template);
  } catch (err) {
    console.error('Signup template error:', err);
    throw err;
  }
})

// Mount auth routes for POST handlers
app.route('/auth', authRoutes)

// Protected routes
app.use('/*', async (c, next) => {
  // Skip auth check for login and signup routes
  if (c.req.path.startsWith('/login') || c.req.path.startsWith('/signup') || c.req.path.startsWith('/auth')) {
    return next()
  }
  console.log('Authenticating request:', c.req.path);
  const start = Date.now();
  const result = await authMiddleware(c, next);
  const duration = Date.now() - start;
  console.log('Authentication completed for', c.req.path, 'in', duration, 'ms');
  return result;
})

// Main routes
app.get('/', async (c) => c.html(homeTemplate()))
app.route('/notes', notesRoutes)
app.route('/profile', profileRoutes) // Ensure this line is present
app.route('/settings', settingsRoutes)

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

export { RAGWorkflow } from './workflows/rag'
export { SessionDO } from './session'
export default app

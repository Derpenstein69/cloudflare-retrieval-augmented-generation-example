import { Hono } from 'hono'
import { cors } from 'hono/cors'
import routes from './routes'
import { errorHandler, authMiddleware, validateEnv, SessionDO } from './shared'
import { templates, errorTemplates } from './Components'
import type { Env } from './types'

const app = new Hono<{ Bindings: Env }>()

// Enhanced error handler
app.onError((err, c) => {
  console.error('Application error:', err);
  return c.html(renderTemplate(() => errorTemplates.serverError(err)));
});

// Global middleware
app.use(cors())
app.use('*', async (c, next) => {
  try {
    const path = new URL(c.req.url).pathname;
    if (path === '/login' || path === '/signup') {
      return next();
    }

    const sessionToken = getCookie(c, 'session');
    if (!sessionToken && path !== '/login' && path !== '/signup') {
      return c.redirect('/login');
    }

    await next();
  } catch (err) {
    console.error('Middleware error:', err);
    return c.redirect('/login');
  }
});

// Public routes with proper error handling
app.get('/login', async (c) => {
  try {
    return c.html(templates.login());
  } catch (error) {
    console.error('Login page error:', error);
    return c.html(errorTemplates.serverError(error));
  }
});

app.get('/signup', async (c) => {
  try {
    return c.html(templates.signup());
  } catch (error) {
    console.error('Signup page error:', error);
    return c.html(errorTemplates.serverError(error));
  }
});

// Protected route group
const protectedRoutes = new Hono<{ Bindings: Env }>()
protectedRoutes.use('*', authMiddleware)
protectedRoutes.route('/', routes)

// Mount protected routes
app.route('/', protectedRoutes)

// Query endpoint
app.get('/query', async (c) => {
  try {
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
  } catch (error) {
    console.error('Query error:', error);
    return c.json({ error: 'Query failed' }, 500);
  }
});

// Export
export { RAGWorkflow } from './workflows/rag'
export { SessionDO }
export default app

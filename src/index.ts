import { Hono } from 'hono'
import { cors } from 'hono/cors'
import routes, { authMiddleware } from './routes'
import { templates } from './Components'
import type { Env } from './types'
import { errorHandler, notFoundHandler, validateEnv } from './middleware'

const app = new Hono<{ Bindings: Env }>()

// Global middleware
app.use(cors())
app.use('*', errorHandler)
app.notFound(notFoundHandler)

// Environment validation
app.use('*', async (c, next) => {
  try {
    validateEnv(c.env);
    await next();
  } catch (err) {
    console.error('Environment error:', err);
    return c.text('Server configuration error', 500);
  }
});

// Public routes
app.get('/login', (c) => c.html(templates.login()))
app.get('/signup', (c) => c.html(templates.signup()))

// Mount all routes with auth middleware
app.use('*', authMiddleware)
app.route('/', routes)

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

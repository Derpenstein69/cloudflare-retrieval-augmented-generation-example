import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { deleteCookie } from 'hono/cookie';
import routes from './routes';
import { authMiddleware, SessionDO } from './shared';
import { templates, errorTemplates, renderTemplate } from './Components';
import type { Env } from './types';

// Logger service
class Logger {
  static log(level: 'DEBUG' | 'INFO' | 'ERROR' | 'WARN', message: string, data?: any) {
    const timestamp = new Date().toISOString();
    console.log(JSON.stringify({ timestamp, level, message, data }));
  }
}

// Performance monitoring
class Metrics {
  private static timings = new Map<string, number>();

  static startTimer(id: string) {
    this.timings.set(id, performance.now());
  }

  static endTimer(id: string): number {
    const start = this.timings.get(id);
    if (!start) return 0;
    const duration = performance.now() - start;
    this.timings.delete(id);
    return duration;
  }
}

const app = new Hono<{ Bindings: Env; Variables: Env['Variables'] }>();

// 1. Request logging middleware BEFORE CORS
app.use('*', async (c, next) => {
  const requestId = crypto.randomUUID();
  // Store requestId in context variables
  c.set('requestId', requestId);

  Metrics.startTimer(requestId);
  Logger.log('INFO', 'Request received', {
    id: requestId,
    method: c.req.method,
    path: c.req.path,
  });

  await next();

  const duration = Metrics.endTimer(requestId);
  Logger.log('INFO', 'Request completed', {
    id: requestId,
    duration,
    status: c.res.status,
  });
});

// 2. CORS middleware
app.use('*', cors({
  origin: '*', // Or specify your domains: ['http://localhost:8787', 'https://yourdomain.com']
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  credentials: true,
  maxAge: 86400,
  // preflightContinue: false // Removed as it does not exist in CORSOptions
}));

// Public routes BEFORE any other middleware
app.get('/login', async (c) => {
  console.log('Handling login page request');
  try {
    const html = renderTemplate(() => templates.login());
    return c.html(html);
  } catch (error) {
    console.error('Login page error:', error);
    return c.html(renderTemplate(() => errorTemplates.serverError(error as Error)));
  }
});
app.get('/signup', (c) => c.html(renderTemplate(() => templates.signup())));

// Enhanced error handler
app.onError((err, c) => {
  const requestId = c.get('requestId');
  Logger.log('ERROR', 'Application error', {
    id: requestId,
    error: err.message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method
  });

  if (err.name === 'ValidationError') {
    return c.json({ error: err.message, code: 'VALIDATION_ERROR' }, 400);
  }

  if (err.name === 'AuthError') {
    deleteCookie(c, 'session', { path: '/' });
    return c.redirect('/login');
  }

  return c.html(renderTemplate(() => errorTemplates.serverError(err)));
});

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Auth routes
const authRoutes = new Hono<{ Bindings: Env }>();
authRoutes.get('/login', async (c) => {
  deleteCookie(c, 'session', { path: '/' });
  return c.html(renderTemplate(templates.login()));
});

authRoutes.get('/signup', (c) => c.html(renderTemplate(templates.signup())));
app.route('/auth', authRoutes);

// Protected API routes
const apiRoutes = new Hono<{ Bindings: Env }>();
apiRoutes.use('*', authMiddleware);

// Enhanced query endpoint with rate limiting and validation
apiRoutes.get('/query', async (c) => {
  const question = c.req.query('text');
  if (!question) {
    return c.json({ error: 'Query text is required' }, 400);
  }

  try {
    const embeddings = await c.env.AI.run('@cf/baai/bge-base-en-v1.5', {
      text: question
    });

    if (!embeddings?.data?.[0]) {
      throw new Error('Failed to generate embeddings');
    }

    const vectorQuery = await c.env.VECTOR_INDEX.query(embeddings.data[0], {
      topK: 1
    });

    const notes = await fetchRelevantNotes(c, vectorQuery);
    const response = await generateAIResponse(c, question, notes);

    return c.json({
      question,
      answer: response,
      context: notes,
    });
  } catch (error) {
    Logger.log('ERROR', 'Query processing failed', { error, question });
    return c.json({
      error: 'Query processing failed',
      code: 'QUERY_ERROR'
    }, 500);
  }
});

app.route('/api', apiRoutes);

// Protected routes
const protectedRoutes = new Hono<{ Bindings: Env }>();
protectedRoutes.use('*', authMiddleware);
protectedRoutes.route('/', routes);
app.route('/', protectedRoutes);

// Helper functions
async function fetchRelevantNotes(c: any, vectorQuery: any): Promise<string[]> {
  const vecId = vectorQuery.matches?.[0]?.id;
  if (!vecId) return [];

  const { results } = await c.env.DATABASE.prepare(
    'SELECT * FROM notes WHERE id = ?'
  ).bind(vecId).all();

  return results?.map((note: { text: string }) => note.text) || [];
}

async function generateAIResponse(c: any, question: string, notes: string[]): Promise<string> {
  const contextMessage = notes.length
    ? `Context:\n${notes.map(note => `- ${note}`).join("\n")}`
    : "";

  const systemPrompt = `When answering the question or responding, use the context provided, if it is provided and relevant.`;

  const response = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      ...(notes.length ? [{ role: 'system', content: contextMessage }] : []),
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question }
    ]
  });

  if (!response?.response) {
    throw new Error('Failed to generate AI response');
  }

  return response.response;
}

export { RAGWorkflow } from './workflows/rag';
export { SessionDO };
export default app;

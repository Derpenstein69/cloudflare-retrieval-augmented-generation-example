import { Hono } from 'hono'
import { methodOverride } from 'hono/method-override'
import type { Env } from '../types'

const notes = new Hono<{ Bindings: Env }>()

notes.get('/notes.json', async (c) => {
  const query = `SELECT * FROM notes`
  const { results } = await c.env.DATABASE.prepare(query).all()
  return c.json(results);
})

notes.get('/notes', async (c) => {
  try {
    const userEmail = c.get('userEmail');
    console.log('Fetching notes for user:', userEmail);
    // Add your notes fetching logic here
    return c.json({ message: 'Notes route working' });
  } catch (error) {
    console.error('Notes route error:', error);
    return c.json({ error: 'Failed to fetch notes' }, 500);
  }
})

notes.use('/notes/:id', methodOverride({ app: notes }))
notes.delete('/notes/:id', async (c) => {
  const { id } = c.req.param();
  const query = `DELETE FROM notes WHERE id = ?`
  await c.env.DATABASE.prepare(query).bind(id).run()
  await c.env.VECTOR_INDEX.deleteByIds([id])
  return c.redirect('/notes')
})

notes.post('/notes', async (c) => {
  const { text } = await c.req.json();
  if (!text) return c.text("Missing text", 400);
  await c.env.RAG_WORKFLOW.create({ params: { text } })
  return c.text("Created note", 201);
})

export default notes
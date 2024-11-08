import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import type { Env, Note } from '../types'

const notes = new Hono<{ Bindings: Env }>()

notes.get('/', async (c) => {
  const sessionToken = getCookie(c, 'session')
  if (!sessionToken) {
    return c.redirect('/login')
  }

  const sessionId = SessionDO.createSessionId(c.env.SESSIONS_DO, sessionToken)
  const sessionDO = c.env.SESSIONS_DO.get(sessionId)
  const response = await sessionDO.fetch(new Request('https://dummy/get'))
  
  if (!response.ok) {
    return c.redirect('/login')
  }

  const userEmail = await response.text()
  if (!userEmail) {
    return c.redirect('/login')
  }

  const notesData = await c.env.DATABASE.prepare('SELECT * FROM notes WHERE userEmail = ?').bind(userEmail).all<Note>()
  if (!notesData.results) {
    return c.json({ error: 'No notes found' }, 404)
  }

  return c.json(notesData.results)
})

notes.post('/', async (c) => {
  const sessionToken = getCookie(c, 'session')
  if (!sessionToken) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const sessionId = SessionDO.createSessionId(c.env.SESSIONS_DO, sessionToken)
  const sessionDO = c.env.SESSIONS_DO.get(sessionId)
  const response = await sessionDO.fetch(new Request('https://dummy/get'))
  
  if (!response.ok) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const userEmail = await response.text()
  if (!userEmail) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const { text } = await c.req.json()
  const noteId = crypto.randomUUID()
  await c.env.DATABASE.prepare('INSERT INTO notes (id, userEmail, text) VALUES (?, ?, ?)').bind(noteId, userEmail, text).run()

  return c.json({ message: 'Note created successfully', id: noteId })
})

export default notes
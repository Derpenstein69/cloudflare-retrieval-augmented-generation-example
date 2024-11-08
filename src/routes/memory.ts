
import { Hono } from 'hono'
import { memoryTemplate } from '../components/memory'

const memoryRoutes = new Hono()

memoryRoutes.get('/', (c) => c.html(memoryTemplate()))

export default memoryRoutes
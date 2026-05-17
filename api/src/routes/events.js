import { Router } from 'express'

const router = Router()

// Connected SSE clients
const clients = new Set()

// Broadcast a named event to all connected clients
export function broadcast(type, data) {
  const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`
  for (const res of clients) {
    try { res.write(payload) } catch { clients.delete(res) }
  }
}

// GET /events — persistent SSE connection
router.get('/', (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection',    'keep-alive')
  res.flushHeaders()

  clients.add(res)
  res.write('event: connected\ndata: {}\n\n')

  req.on('close', () => clients.delete(res))
})

export default router

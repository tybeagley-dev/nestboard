import { Router } from 'express'
import { db } from '../db/client.js'

const router = Router()

// Connected SSE clients, each tagged with its family so broadcasts stay scoped.
const clients = new Set() // entries: { res, familyId }

// Broadcast a named event to the clients of ONE family only. familyId is required
// — there are no cross-family/global broadcasts, which is what keeps the realtime
// channel multi-tenant safe.
export function broadcast(type, data, familyId) {
  if (!familyId) return
  const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`
  for (const c of clients) {
    if (c.familyId !== familyId) continue
    try { c.res.write(payload) } catch { clients.delete(c) }
  }
}

// GET /events?slug=<familySlug> — persistent SSE connection, scoped to a family.
// EventSource can't send auth headers, so the family is identified by its opaque
// slug in the query string (same trust level as the kiosk x-family-slug flow).
router.get('/', async (req, res) => {
  const slug = req.query.slug
  if (!slug) return res.status(400).end()

  let familyId
  try {
    const { rows } = await db.query('SELECT id FROM families WHERE slug = $1', [slug])
    if (!rows.length) return res.status(404).end()
    familyId = rows[0].id
  } catch {
    return res.status(500).end()
  }

  res.setHeader('Content-Type',  'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection',    'keep-alive')
  res.flushHeaders()

  const client = { res, familyId }
  clients.add(client)
  res.write('event: connected\ndata: {}\n\n')

  // Heartbeat comment keeps the connection alive through idle-timeout proxies.
  const heartbeat = setInterval(() => {
    try { res.write(':\n\n') } catch { clearInterval(heartbeat); clients.delete(client) }
  }, 25000)

  req.on('close', () => { clearInterval(heartbeat); clients.delete(client) })
})

export default router

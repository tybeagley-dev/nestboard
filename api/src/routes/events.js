import { Router } from 'express'
import { randomUUID } from 'crypto'
import { requireFamily } from '../middleware/requireFamily.js'

const router = Router()

// Short-lived, single-use SSE tickets. EventSource can't send headers, so the
// family used to be identified by ?slug= — putting a permanent credential into
// every proxy log, access log and Referer. A ticket is minted over a normal
// authenticated request and dies in 60 seconds, so what lands in logs is already
// worthless. In-memory on purpose: tickets outlive neither the process nor the
// minute, and a restart just makes clients mint a new one.
const TICKET_TTL_MS = 60_000
const tickets = new Map() // ticket -> { familyId, expiresAt }

function issueTicket(familyId) {
  const ticket = randomUUID()
  tickets.set(ticket, { familyId, expiresAt: Date.now() + TICKET_TTL_MS })
  return ticket
}

function redeemTicket(ticket) {
  const entry = tickets.get(ticket)
  if (!entry) return null
  tickets.delete(ticket)                       // single use
  if (entry.expiresAt <= Date.now()) return null
  return entry.familyId
}

// Sweep expired tickets so an abandoned client can't grow the map unbounded.
setInterval(() => {
  const now = Date.now()
  for (const [t, e] of tickets) if (e.expiresAt <= now) tickets.delete(t)
}, TICKET_TTL_MS).unref?.()

// POST /events/ticket → { ticket } — auth travels in headers here, not the URL.
router.post('/ticket', requireFamily, (req, res) => {
  res.json({ ticket: issueTicket(req.familyId) })
})

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

// GET /events?ticket=<ticket> — persistent SSE connection, scoped to a family.
// Tickets only; ?slug= is deliberately no longer accepted. A client on stale JS
// simply fails to connect and falls back to the existing 20s polls.
router.get('/', async (req, res) => {
  const familyId = redeemTicket(req.query.ticket)
  if (!familyId) return res.status(401).end()

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

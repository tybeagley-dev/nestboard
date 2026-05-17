import { Router } from 'express'
import { db } from '../db/client.js'
import { requireParent } from '../middleware/requireParent.js'
import { broadcast } from './events.js'

const router = Router()

// GET /chores
router.get('/', async (req, res) => {
  const includeInactive = req.query.includeInactive === 'true'
  const { rows } = await db.query(
    `SELECT * FROM chores ${includeInactive ? '' : 'WHERE active = true'} ORDER BY label`
  )
  res.json(rows)
})

// GET /chores/state?date=YYYY-MM-DD
router.get('/state', async (req, res) => {
  const { date } = req.query
  if (!date) return res.status(400).json({ error: 'date required' })

  // Week start = Sunday of the given date
  const ref = new Date(date)
  const dow = ref.getDay()
  const weekStart = new Date(ref)
  weekStart.setDate(ref.getDate() - dow)

  const { rows } = await db.query(
    `SELECT * FROM chore_events
     WHERE created_at >= $1
     ORDER BY created_at ASC`,
    [weekStart.toISOString()]
  )

  const PRIORITY = { completed: 2, pending_approval: 1, accepted: 0 }
  const today = {}
  const weekCompleted = {}

  for (const row of rows) {
    const rowDate = row.created_at.toISOString().slice(0, 10)
    const { child, chore_id, chore_label, bucks, status, accepted_at } = row

    if (rowDate === date) {
      if (!today[child]) today[child] = {}
      const existing = today[child][chore_id]
      const existingPri = existing ? (PRIORITY[existing.status] ?? -1) : -1
      if (!existing || (PRIORITY[status] ?? 0) > existingPri) {
        today[child][chore_id] = {
          choreLabel: chore_label,
          bucks,
          status,
          acceptedAt: accepted_at ?? existing?.acceptedAt ?? null,
        }
      }
    }

    if (status === 'completed') {
      if (!weekCompleted[child]) weekCompleted[child] = []
      if (!weekCompleted[child].includes(chore_id)) weekCompleted[child].push(chore_id)
    }
  }

  res.json({ today, weekCompleted })
})

// GET /chores/pending-approvals
router.get('/pending-approvals', async (_req, res) => {
  const { rows } = await db.query(
    `SELECT * FROM chore_events WHERE status = 'pending_approval' ORDER BY created_at ASC`
  )
  res.json(rows)
})

// POST /chores/:id/accept  { child, choreLabel, bucks }
router.post('/:id/accept', async (req, res) => {
  const { child, choreLabel, bucks } = req.body
  const choreId = req.params.id
  if (!child || !choreId) return res.status(400).json({ error: 'Missing params' })

  await db.query(
    `INSERT INTO chore_events (child, chore_id, chore_label, bucks, status, accepted_at)
     VALUES ($1, $2, $3, $4, 'accepted', NOW())`,
    [child, choreId, choreLabel, bucks]
  )
  broadcast('chore_state', { child })
  res.json({ success: true })
})

// POST /chores/:id/request-approval  { child, choreLabel, bucks }
router.post('/:id/request-approval', async (req, res) => {
  const { child, choreLabel, bucks } = req.body
  const choreId = req.params.id
  if (!child || !choreId) return res.status(400).json({ error: 'Missing params' })

  const today = new Date().toISOString().slice(0, 10)

  // Idempotent — skip if already pending or completed today
  const { rows } = await db.query(
    `SELECT id FROM chore_events
     WHERE child = $1 AND chore_id = $2
       AND created_at::date = $3
       AND status IN ('pending_approval', 'completed')
     LIMIT 1`,
    [child, choreId, today]
  )
  if (rows.length) return res.json({ success: true, skipped: true })

  await db.query(
    `INSERT INTO chore_events (child, chore_id, chore_label, bucks, status)
     VALUES ($1, $2, $3, $4, 'pending_approval')`,
    [child, choreId, choreLabel, bucks]
  )
  broadcast('chore_state', { child })
  res.json({ success: true })
})

// POST /chores/:id/approve  { child }
router.post('/:id/approve', requireParent, async (req, res) => {
  const { child } = req.body
  const choreId = req.params.id

  const { rows } = await db.query(
    `UPDATE chore_events SET status = 'completed'
     WHERE child = $1 AND chore_id = $2 AND status = 'pending_approval'
     RETURNING bucks`,
    [child, choreId]
  )
  if (!rows.length) return res.status(404).json({ error: 'No pending approval found' })

  const bucksEarned = rows[0].bucks
  await db.query(
    `UPDATE bucks_balance SET balance = balance + $1, updated_at = NOW() WHERE child = $2`,
    [bucksEarned, child]
  )
  broadcast('chore_state', { child })
  broadcast('bucks', { child })
  res.json({ success: true, bucksEarned })
})

// POST /chores/:id/reject  { child }
router.post('/:id/reject', requireParent, async (req, res) => {
  const { child } = req.body
  const choreId = req.params.id

  const { rowCount } = await db.query(
    `DELETE FROM chore_events
     WHERE child = $1 AND chore_id = $2 AND status = 'pending_approval'`,
    [child, choreId]
  )
  if (!rowCount) return res.status(404).json({ error: 'No pending approval found' })

  broadcast('chore_state', { child })
  res.json({ success: true })
})

// ── Admin (parent only) ───────────────────────────────────────────────────────

router.post('/', requireParent, async (req, res) => {
  const { id, label, bucks, icon, active, required, days, instructions, max_per_week } = req.body
  await db.query(
    `INSERT INTO chores (id, label, bucks, icon, active, required, days, instructions, max_per_week)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [id, label, bucks, icon, active ?? true, required ?? false, days ?? [], instructions ?? [], max_per_week ?? null]
  )
  res.json({ success: true })
})

router.put('/:id', requireParent, async (req, res) => {
  const { label, bucks, icon, active, required, days, instructions, max_per_week } = req.body
  await db.query(
    `UPDATE chores SET label=$1, bucks=$2, icon=$3, active=$4, required=$5,
     days=$6, instructions=$7, max_per_week=$8 WHERE id=$9`,
    [label, bucks, icon, active, required, days, instructions, max_per_week, req.params.id]
  )
  res.json({ success: true })
})

router.delete('/:id', requireParent, async (req, res) => {
  await db.query(`DELETE FROM chores WHERE id = $1`, [req.params.id])
  res.json({ success: true })
})

// ── History viewing + editing (parent only) ───────────────────────────────────

router.get('/events', requireParent, async (req, res) => {
  const { child, date } = req.query
  let query = `SELECT * FROM chore_events WHERE 1=1`
  const params = []
  if (child) { params.push(child); query += ` AND child = $${params.length}` }
  if (date)  { params.push(date);  query += ` AND created_at::date = $${params.length}::date` }
  query += ` ORDER BY created_at DESC LIMIT 100`
  const { rows } = await db.query(query, params)
  res.json(rows)
})

router.patch('/events/:eventId', requireParent, async (req, res) => {
  const { status } = req.body
  const validStatuses = ['accepted', 'pending_approval', 'completed', 'rejected']
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' })

  const { rows } = await db.query(
    `UPDATE chore_events SET status = $1 WHERE id = $2 RETURNING child`,
    [status, req.params.eventId]
  )
  if (!rows.length) return res.status(404).json({ error: 'Event not found' })
  broadcast('chore_state', { child: rows[0].child })
  res.json({ success: true })
})

router.delete('/events/:eventId', requireParent, async (req, res) => {
  const { rows } = await db.query(
    `DELETE FROM chore_events WHERE id = $1 RETURNING child`,
    [req.params.eventId]
  )
  if (!rows.length) return res.status(404).json({ error: 'Event not found' })
  broadcast('chore_state', { child: rows[0].child })
  res.json({ success: true })
})

export default router

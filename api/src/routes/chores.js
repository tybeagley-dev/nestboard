import { Router } from 'express'
import { db } from '../db/client.js'
import { requireFamily } from '../middleware/requireFamily.js'
import { requireParent } from '../middleware/requireParent.js'
import { broadcast } from './events.js'
import { resolveChildId } from '../db/resolveChild.js'
import { notifyParent, notifyChild } from '../utils/push.js'

const router = Router()

router.use(requireFamily)

// GET /chores
router.get('/', async (req, res) => {
  const includeInactive = req.query.includeInactive === 'true'
  const { rows } = await db.query(
    `SELECT * FROM chores WHERE family_id = $1 ${includeInactive ? '' : 'AND active = true'} ORDER BY label`,
    [req.familyId]
  )
  res.json(rows)
})

// GET /chores/state?date=YYYY-MM-DD
router.get('/state', async (req, res) => {
  const { date } = req.query
  if (!date) return res.status(400).json({ error: 'date required' })

  const ref = new Date(date)
  const dow = ref.getDay()
  const weekStart = new Date(ref)
  weekStart.setDate(ref.getDate() - dow)

  const { rows } = await db.query(
    `SELECT ce.chore_id, ce.chore_label, ce.tokens, ce.status, ce.accepted_at, ce.created_at,
            ch.name AS child
     FROM chore_events ce
     JOIN children ch ON ch.id = ce.child_id
     WHERE ce.family_id = $1 AND ce.created_at >= $2
     ORDER BY ce.created_at ASC`,
    [req.familyId, weekStart.toISOString()]
  )

  const PRIORITY = { completed: 2, pending_approval: 1, accepted: 0 }
  const today = {}
  const weekCompleted = {}

  const nextDay = new Date(date)
  nextDay.setDate(nextDay.getDate() + 1)
  const nextDayKey = nextDay.toISOString().slice(0, 10)

  for (const row of rows) {
    const rowDate = row.created_at.toISOString().slice(0, 10)
    const { child, chore_id, chore_label, tokens, status, accepted_at } = row

    if (rowDate === date || rowDate === nextDayKey) {
      if (!today[child]) today[child] = {}
      const existing = today[child][chore_id]
      const existingPri = existing ? (PRIORITY[existing.status] ?? -1) : -1
      if (!existing || (PRIORITY[status] ?? 0) > existingPri) {
        today[child][chore_id] = {
          choreLabel: chore_label,
          tokens,
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
router.get('/pending-approvals', async (req, res) => {
  const { rows } = await db.query(
    `SELECT ce.id, ce.family_id, ce.child_id, ce.chore_id, ce.chore_label,
            ce.tokens, ce.status, ce.accepted_at, ce.created_at, ch.name AS child
     FROM chore_events ce
     JOIN children ch ON ch.id = ce.child_id
     WHERE ce.family_id = $1 AND ce.status = 'pending_approval'
     ORDER BY ce.created_at ASC`,
    [req.familyId]
  )
  res.json(rows)
})

// DELETE /chores/:id/assignment?child=Name
router.delete('/:id/assignment', requireParent, async (req, res) => {
  const childName = req.query.child
  const choreId = req.params.id
  if (!childName) return res.status(400).json({ error: 'child required' })

  const childId = await resolveChildId(req.familyId, childName)
  if (!childId) return res.status(404).json({ error: 'Unknown child' })

  try {
    const { rowCount } = await db.query(
      `DELETE FROM chore_events
       WHERE id = (
         SELECT id FROM chore_events
         WHERE family_id = $1 AND child_id = $2 AND chore_id = $3
           AND status IN ('accepted', 'pending_approval')
         ORDER BY created_at DESC
         LIMIT 1
       )`,
      [req.familyId, childId, choreId]
    )
    if (!rowCount) return res.status(404).json({ error: 'No active assignment found' })
    broadcast('chore_state', { child: childName })
    res.json({ success: true })
  } catch (err) {
    console.error('unassign error', err)
    res.status(500).json({ error: 'Failed to unassign chore' })
  }
})

// POST /chores/:id/accept  { child, choreLabel, tokens }
router.post('/:id/accept', async (req, res) => {
  const { child, choreLabel, tokens } = req.body
  const choreId = req.params.id
  if (!child || !choreId || !choreLabel) return res.status(400).json({ error: 'Missing params' })

  const childId = await resolveChildId(req.familyId, child)
  if (!childId) return res.status(404).json({ error: 'Unknown child' })

  try {
    await db.query(
      `INSERT INTO chore_events (family_id, child_id, chore_id, chore_label, tokens, status, accepted_at)
       VALUES ($1, $2, $3, $4, $5, 'accepted', NOW())`,
      [req.familyId, childId, choreId, choreLabel, tokens]
    )
    broadcast('chore_state', { child })
    res.json({ success: true })
  } catch (err) {
    console.error('accept error', err)
    res.status(500).json({ error: 'Failed to accept chore' })
  }
})

// POST /chores/:id/request-approval  { child, choreLabel, tokens }
router.post('/:id/request-approval', async (req, res) => {
  const { child, choreLabel, tokens } = req.body
  const choreId = req.params.id
  if (!child || !choreId) return res.status(400).json({ error: 'Missing params' })

  const childId = await resolveChildId(req.familyId, child)
  if (!childId) return res.status(404).json({ error: 'Unknown child' })

  const today = new Date().toISOString().slice(0, 10)

  // Promote the existing accepted row — no new row created, so unassign always sees one row
  const { rowCount } = await db.query(
    `UPDATE chore_events SET status = 'pending_approval'
     WHERE family_id = $1 AND child_id = $2 AND chore_id = $3
       AND created_at::date = $4
       AND status = 'accepted'`,
    [req.familyId, childId, choreId, today]
  )
  // Already pending or completed — nothing to do
  if (!rowCount) return res.json({ success: true, skipped: true })

  broadcast('chore_state', { child })
  notifyParent(req.familyId, { title: 'Chore submitted', body: `${child} submitted "${choreLabel}" for approval` })
  res.json({ success: true })
})

// POST /chores/:id/approve  { child }
router.post('/:id/approve', requireParent, async (req, res) => {
  const { child } = req.body
  const choreId = req.params.id

  const childId = await resolveChildId(req.familyId, child)
  if (!childId) return res.status(404).json({ error: 'Unknown child' })

  const { rows } = await db.query(
    `UPDATE chore_events SET status = 'completed'
     WHERE family_id = $1 AND child_id = $2 AND chore_id = $3 AND status = 'pending_approval'
     RETURNING tokens`,
    [req.familyId, childId, choreId]
  )
  if (!rows.length) return res.status(404).json({ error: 'No pending approval found' })

  const tokensEarned = rows[0].tokens
  await db.query(
    `UPDATE token_balance SET balance = balance + $1, updated_at = NOW()
     WHERE family_id = $2 AND child_id = $3`,
    [tokensEarned, req.familyId, childId]
  )
  broadcast('chore_state', { child })
  broadcast('tokens', { child })
  notifyChild(req.familyId, childId, { title: 'Chore approved!', body: `You earned ${tokensEarned} token${tokensEarned !== 1 ? 's' : ''}` })
  res.json({ success: true, tokensEarned })
})

// POST /chores/:id/reject  { child }
router.post('/:id/reject', requireParent, async (req, res) => {
  const { child } = req.body
  const choreId = req.params.id

  const childId = await resolveChildId(req.familyId, child)
  if (!childId) return res.status(404).json({ error: 'Unknown child' })

  const { rowCount } = await db.query(
    `UPDATE chore_events SET status = 'accepted'
     WHERE family_id = $1 AND child_id = $2 AND chore_id = $3 AND status = 'pending_approval'`,
    [req.familyId, childId, choreId]
  )
  if (!rowCount) return res.status(404).json({ error: 'No pending approval found' })

  broadcast('chore_state', { child })
  res.json({ success: true })
})

// ── Admin (parent only) ───────────────────────────────────────────────────────

router.post('/', requireParent, async (req, res) => {
  const { id, label, tokens, icon, active, required, days, instructions, max_per_week } = req.body
  await db.query(
    `INSERT INTO chores (id, family_id, label, tokens, icon, active, required, days, instructions, max_per_week)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [id, req.familyId, label, tokens, icon, active ?? true, required ?? false, days ?? [], instructions ?? [], max_per_week ?? null]
  )
  res.json({ success: true })
})

router.put('/:id', requireParent, async (req, res) => {
  const { label, tokens, icon, active, required, days, instructions, max_per_week } = req.body
  await db.query(
    `UPDATE chores SET label=$1, tokens=$2, icon=$3, active=$4, required=$5,
     days=$6, instructions=$7, max_per_week=$8
     WHERE id=$9 AND family_id=$10`,
    [label, tokens, icon, active, required, days, instructions, max_per_week, req.params.id, req.familyId]
  )
  res.json({ success: true })
})

router.delete('/:id', requireParent, async (req, res) => {
  await db.query(`DELETE FROM chores WHERE id = $1 AND family_id = $2`, [req.params.id, req.familyId])
  res.json({ success: true })
})

// ── History viewing + editing (parent only) ───────────────────────────────────

router.get('/events', requireParent, async (req, res) => {
  const { child, date } = req.query
  let query = `SELECT ce.id, ce.family_id, ce.child_id, ce.chore_id, ce.chore_label,
                      ce.tokens, ce.status, ce.accepted_at, ce.created_at, ch.name AS child
               FROM chore_events ce
               JOIN children ch ON ch.id = ce.child_id
               WHERE ce.family_id = $1`
  const params = [req.familyId]
  if (child) {
    const childId = await resolveChildId(req.familyId, child)
    if (!childId) return res.status(400).json({ error: 'Unknown child' })
    params.push(childId)
    query += ` AND ce.child_id = $${params.length}`
  }
  if (date) { params.push(date); query += ` AND ce.created_at::date = $${params.length}::date` }
  query += ` ORDER BY ce.created_at DESC LIMIT 100`
  const { rows } = await db.query(query, params)
  res.json(rows)
})

router.patch('/events/:eventId', requireParent, async (req, res) => {
  const { status } = req.body
  const validStatuses = ['accepted', 'pending_approval', 'completed', 'rejected']
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' })

  const { rows } = await db.query(
    `WITH updated AS (
       UPDATE chore_events SET status = $1
       WHERE id = $2 AND family_id = $3
       RETURNING child_id
     )
     SELECT ch.name AS child FROM updated u JOIN children ch ON ch.id = u.child_id`,
    [status, req.params.eventId, req.familyId]
  )
  if (!rows.length) return res.status(404).json({ error: 'Event not found' })
  broadcast('chore_state', { child: rows[0].child })
  res.json({ success: true })
})

router.delete('/events/:eventId', requireParent, async (req, res) => {
  const { rows } = await db.query(
    `WITH deleted AS (
       DELETE FROM chore_events WHERE id = $1 AND family_id = $2 RETURNING child_id
     )
     SELECT ch.name AS child FROM deleted d JOIN children ch ON ch.id = d.child_id`,
    [req.params.eventId, req.familyId]
  )
  if (!rows.length) return res.status(404).json({ error: 'Event not found' })
  broadcast('chore_state', { child: rows[0].child })
  res.json({ success: true })
})

export default router

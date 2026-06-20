import { Router } from 'express'
import { db } from '../db/client.js'
import { requireFamily } from '../middleware/requireFamily.js'
import { requireParent } from '../middleware/requireParent.js'
import { broadcast } from './events.js'
import { resolveChildId } from '../db/resolveChild.js'

const router = Router()

router.use(requireFamily)

// GET /routines?date=YYYY-MM-DD
router.get('/', async (req, res) => {
  const { date } = req.query
  if (!date) return res.status(400).json({ error: 'date required' })

  const { rows } = await db.query(
    `SELECT ch.name AS child, rl.routine_id, rl.completed
     FROM routine_log rl
     JOIN children ch ON ch.id = rl.child_id
     WHERE rl.family_id = $1 AND rl.date = $2`,
    [req.familyId, date]
  )
  const completed = {}
  for (const row of rows) {
    completed[`${row.child}__${row.routine_id}`] = row.completed
  }
  res.json({ date, completed })
})

// POST /routines/toggle  { date, child, routineId }
router.post('/toggle', async (req, res) => {
  const { date, child, routineId } = req.body
  if (!date || !child || !routineId) return res.status(400).json({ error: 'Missing params' })

  const childId = await resolveChildId(req.familyId, child)
  if (!childId) return res.status(404).json({ error: 'Unknown child' })

  await db.query(
    `INSERT INTO routine_log (family_id, date, child_id, routine_id, completed, updated_at)
     VALUES ($1, $2, $3, $4, true, NOW())
     ON CONFLICT (family_id, date, child_id, routine_id)
     DO UPDATE SET completed = NOT routine_log.completed, updated_at = NOW()`,
    [req.familyId, date, childId, routineId]
  )

  const state = await db.query(
    `SELECT ch.name AS child, rl.routine_id, rl.completed
     FROM routine_log rl
     JOIN children ch ON ch.id = rl.child_id
     WHERE rl.family_id = $1 AND rl.date = $2`,
    [req.familyId, date]
  )
  const completed = {}
  for (const row of state.rows) {
    completed[`${row.child}__${row.routine_id}`] = row.completed
  }

  broadcast('routine_state', { date, completed }, req.familyId)
  res.json({ date, completed })
})

// ── Routine definitions ───────────────────────────────────────────────────────

router.get('/defs', async (req, res) => {
  const { rows } = await db.query(
    `SELECT rd.id, rd.family_id, rd.child_id, rd.label, rd.icon, rd.schedules,
            rd.time, rd.sort_order, rd.created_at, ch.name AS child
     FROM routine_defs rd
     JOIN children ch ON ch.id = rd.child_id
     WHERE rd.family_id = $1
     ORDER BY ch.sort_order, rd.sort_order, rd.label`,
    [req.familyId]
  )
  res.json(rows)
})

router.post('/defs', requireParent, async (req, res) => {
  const { id, child, label, icon, schedules, time, sort_order } = req.body
  const childId = await resolveChildId(req.familyId, child)
  if (!childId) return res.status(404).json({ error: 'Unknown child' })

  await db.query(
    `INSERT INTO routine_defs (id, family_id, child_id, label, icon, schedules, time, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [id, req.familyId, childId, label, icon, schedules ?? [], time ?? null, sort_order ?? 0]
  )
  res.json({ success: true })
})

router.put('/defs/:id', requireParent, async (req, res) => {
  const { child, label, icon, schedules, time, sort_order } = req.body
  const childId = await resolveChildId(req.familyId, child)
  if (!childId) return res.status(404).json({ error: 'Unknown child' })

  await db.query(
    `UPDATE routine_defs SET child_id=$1, label=$2, icon=$3, schedules=$4, time=$5, sort_order=$6
     WHERE id=$7 AND family_id=$8`,
    [childId, label, icon, schedules, time ?? null, sort_order, req.params.id, req.familyId]
  )
  res.json({ success: true })
})

router.delete('/defs/:id', requireParent, async (req, res) => {
  await db.query(
    `DELETE FROM routine_defs WHERE id = $1 AND family_id = $2`,
    [req.params.id, req.familyId]
  )
  res.json({ success: true })
})

export default router

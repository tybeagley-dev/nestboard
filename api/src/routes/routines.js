import { Router } from 'express'
import { db } from '../db/client.js'
import { requireParent } from '../middleware/requireParent.js'
import { broadcast } from './events.js'

const router = Router()

// GET /routines?date=YYYY-MM-DD
router.get('/', async (req, res) => {
  const { date } = req.query
  if (!date) return res.status(400).json({ error: 'date required' })

  const { rows } = await db.query(
    `SELECT child, routine_id, completed FROM routine_log WHERE date = $1`,
    [date]
  )
  const completed = {}
  for (const row of rows) {
    const key = `${row.child}__${row.routine_id}`
    completed[key] = row.completed
  }
  res.json({ date, completed })
})

// POST /routines/toggle  { date, child, routineId }
router.post('/toggle', async (req, res) => {
  const { date, child, routineId } = req.body
  if (!date || !child || !routineId) return res.status(400).json({ error: 'Missing params' })

  const { rows } = await db.query(
    `INSERT INTO routine_log (date, child, routine_id, completed, updated_at)
     VALUES ($1, $2, $3, true, NOW())
     ON CONFLICT (date, child, routine_id)
     DO UPDATE SET completed = NOT routine_log.completed, updated_at = NOW()
     RETURNING completed`,
    [date, child, routineId]
  )

  const state = await db.query(
    `SELECT child, routine_id, completed FROM routine_log WHERE date = $1`,
    [date]
  )
  const completed = {}
  for (const row of state.rows) {
    completed[`${row.child}__${row.routine_id}`] = row.completed
  }

  broadcast('routine_state', { date, completed })
  res.json({ date, completed })
})

// ── Routine definitions ───────────────────────────────────────────────────────

// GET /routines/defs
router.get('/defs', async (_req, res) => {
  const { rows } = await db.query(`SELECT * FROM routine_defs ORDER BY child, sort_order, label`)
  res.json(rows)
})

router.post('/defs', requireParent, async (req, res) => {
  const { id, child, label, icon, schedules, time, sort_order } = req.body
  await db.query(
    `INSERT INTO routine_defs (id, child, label, icon, schedules, time, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [id, child, label, icon, schedules ?? [], time ?? null, sort_order ?? 0]
  )
  res.json({ success: true })
})

router.put('/defs/:id', requireParent, async (req, res) => {
  const { child, label, icon, schedules, time, sort_order } = req.body
  await db.query(
    `UPDATE routine_defs SET child=$1, label=$2, icon=$3, schedules=$4, time=$5, sort_order=$6
     WHERE id=$7`,
    [child, label, icon, schedules, time ?? null, sort_order, req.params.id]
  )
  res.json({ success: true })
})

router.delete('/defs/:id', requireParent, async (req, res) => {
  await db.query(`DELETE FROM routine_defs WHERE id = $1`, [req.params.id])
  res.json({ success: true })
})

export default router

import { Router } from 'express'
import { nanoid } from 'nanoid'
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

// A routine belongs to the family and applies to N children via child_ids.
// An empty child_ids means every child, so children added later inherit it.
// Ordered by time-of-day group, then sort_order — the sequence a parent set.
router.get('/defs', async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, family_id, child_ids, label, icon, schedules, time, sort_order, created_at
     FROM routine_defs
     WHERE family_id = $1
     ORDER BY COALESCE(time, ''), sort_order, label`,
    [req.familyId]
  )
  res.json(rows)
})

// Accepts child ids or names so callers can pass either — resolveChildId matches
// on name alone, and the parent UI works in ids. Returns null if any entry is
// unknown; an empty/absent list is preserved as "every child", not an error.
async function normalizeChildIds(familyId, input) {
  if (!Array.isArray(input) || input.length === 0) return []
  const { rows } = await db.query(
    'SELECT id, name FROM children WHERE family_id = $1',
    [familyId]
  )
  const ids = new Set(rows.map(r => r.id))
  const byName = new Map(rows.map(r => [r.name, r.id]))
  const out = []
  for (const entry of input) {
    const id = ids.has(entry) ? entry : byName.get(entry)
    if (!id) return null
    out.push(id)
  }
  return [...new Set(out)]
}

// POST /routines/defs  { label, icon, schedules, time, child_ids }
router.post('/defs', requireParent, async (req, res) => {
  const { label, icon, schedules, time, child_ids } = req.body ?? {}
  if (!label?.trim()) return res.status(400).json({ error: 'label required' })

  const childIds = await normalizeChildIds(req.familyId, child_ids)
  if (childIds === null) return res.status(404).json({ error: 'Unknown child' })

  // Append to the end of its time-of-day group.
  const { rows } = await db.query(
    `SELECT COALESCE(MAX(sort_order) + 1, 0)::int AS n
     FROM routine_defs WHERE family_id = $1 AND COALESCE(time, '') = $2`,
    [req.familyId, time || '']
  )

  const id = `rd_${nanoid(12)}`
  await db.query(
    `INSERT INTO routine_defs (id, family_id, child_ids, label, icon, schedules, time, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [id, req.familyId, childIds, label.trim(), icon ?? '', schedules ?? [], time || null, rows[0].n]
  )
  res.status(201).json({ success: true, id })
})

// PUT /routines/defs/order  { ids: [routineId] }  — ids in their new order.
// Registered before /defs/:id, which would otherwise match "order" as an id.
// Positions are assigned within each id's own time-of-day group, so one call
// can carry a reorder of several groups at once.
router.put('/defs/order', requireParent, async (req, res) => {
  const { ids } = req.body ?? {}
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids required' })

  const client = await db.connect()
  try {
    await client.query('BEGIN')
    const seen = {}
    for (const id of ids) {
      const { rows } = await client.query(
        `SELECT COALESCE(time, '') AS grp FROM routine_defs WHERE id = $1 AND family_id = $2`,
        [id, req.familyId]
      )
      if (!rows.length) continue
      const grp = rows[0].grp
      seen[grp] = (seen[grp] ?? -1) + 1
      await client.query(
        `UPDATE routine_defs SET sort_order = $1 WHERE id = $2 AND family_id = $3`,
        [seen[grp], id, req.familyId]
      )
    }
    await client.query('COMMIT')
    res.json({ success: true })
  } catch {
    await client.query('ROLLBACK')
    res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
})

router.put('/defs/:id', requireParent, async (req, res) => {
  const { label, icon, schedules, time, child_ids, sort_order } = req.body ?? {}
  if (!label?.trim()) return res.status(400).json({ error: 'label required' })

  const childIds = await normalizeChildIds(req.familyId, child_ids)
  if (childIds === null) return res.status(404).json({ error: 'Unknown child' })

  await db.query(
    `UPDATE routine_defs
        SET child_ids=$1, label=$2, icon=$3, schedules=$4, time=$5, sort_order=$6
      WHERE id=$7 AND family_id=$8`,
    [childIds, label.trim(), icon ?? '', schedules ?? [], time || null, sort_order ?? 0,
     req.params.id, req.familyId]
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

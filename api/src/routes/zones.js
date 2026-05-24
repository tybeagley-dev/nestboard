import { Router } from 'express'
import { db } from '../db/client.js'
import { requireFamily } from '../middleware/requireFamily.js'
import { requireParent } from '../middleware/requireParent.js'
import { nanoid } from 'nanoid'

const router = Router()
router.use(requireFamily)

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMondayOf(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z')
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

async function autoAssignWeek(familyId, weekOf) {
  // Fetch all active micro-zones joined to their parent zone's eligibility
  const { rows: microZones } = await db.query(
    `SELECT mz.id, mz.zone_id, z.eligible_child_ids
     FROM micro_zones mz
     JOIN zones z ON z.id = mz.zone_id
     WHERE mz.family_id = $1 AND mz.active = true`,
    [familyId]
  )

  const { rows: children } = await db.query(
    `SELECT id FROM children WHERE family_id = $1 ORDER BY sort_order`,
    [familyId]
  )

  const shuffledChildren = shuffle([...children])
  const usedMicroZoneIds = new Set()

  for (const child of shuffledChildren) {
    const eligible = microZones.filter(mz => {
      if (usedMicroZoneIds.has(mz.id)) return false
      if (mz.eligible_child_ids.length === 0) return true
      return mz.eligible_child_ids.includes(child.id)
    })
    if (eligible.length === 0) continue

    const picked = eligible[Math.floor(Math.random() * eligible.length)]
    usedMicroZoneIds.add(picked.id)

    await db.query(
      `INSERT INTO zone_assignments (id, family_id, child_id, micro_zone_id, week_of, is_auto)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT DO NOTHING`,
      [nanoid(), familyId, child.id, picked.id, weekOf]
    )
  }
}

async function getAssignmentsWithDetails(familyId, weekOf) {
  const { rows } = await db.query(
    `SELECT za.id, za.child_id, za.micro_zone_id, za.week_of, za.is_auto,
            ch.name AS child_name,
            mz.label AS micro_zone_label,
            z.id AS zone_id, z.label AS zone_label, z.icon AS zone_icon
     FROM zone_assignments za
     JOIN children ch ON ch.id = za.child_id
     JOIN micro_zones mz ON mz.id = za.micro_zone_id
     JOIN zones z ON z.id = mz.zone_id
     WHERE za.family_id = $1 AND za.week_of = $2
     ORDER BY ch.name, za.is_auto DESC`,
    [familyId, weekOf]
  )
  return rows
}

// ── Zone definitions ──────────────────────────────────────────────────────────

router.get('/defs', async (req, res) => {
  const { rows } = await db.query(
    `SELECT z.id, z.label, z.icon, z.eligible_child_ids, z.sort_order,
            COALESCE(
              json_agg(
                json_build_object('id', mz.id, 'label', mz.label, 'active', mz.active, 'sort_order', mz.sort_order)
                ORDER BY mz.sort_order
              ) FILTER (WHERE mz.id IS NOT NULL),
              '[]'
            ) AS micro_zones
     FROM zones z
     LEFT JOIN micro_zones mz ON mz.zone_id = z.id
     WHERE z.family_id = $1
     GROUP BY z.id
     ORDER BY z.sort_order, z.label`,
    [req.familyId]
  )
  res.json(rows)
})

router.post('/defs', requireParent, async (req, res) => {
  const { label, icon, eligible_child_ids, sort_order } = req.body
  const id = nanoid()
  await db.query(
    `INSERT INTO zones (id, family_id, label, icon, eligible_child_ids, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, req.familyId, label, icon ?? '', eligible_child_ids ?? [], sort_order ?? 0]
  )
  res.json({ id })
})

router.put('/defs/:id', requireParent, async (req, res) => {
  const { label, icon, eligible_child_ids, sort_order } = req.body
  await db.query(
    `UPDATE zones SET label=$1, icon=$2, eligible_child_ids=$3, sort_order=$4
     WHERE id=$5 AND family_id=$6`,
    [label, icon ?? '', eligible_child_ids ?? [], sort_order ?? 0, req.params.id, req.familyId]
  )
  res.json({ success: true })
})

router.delete('/defs/:id', requireParent, async (req, res) => {
  await db.query(`DELETE FROM zones WHERE id=$1 AND family_id=$2`, [req.params.id, req.familyId])
  res.json({ success: true })
})

// ── Micro-zones ───────────────────────────────────────────────────────────────

router.post('/micro-zones', requireParent, async (req, res) => {
  const { zone_id, label, active, sort_order } = req.body
  const id = nanoid()
  await db.query(
    `INSERT INTO micro_zones (id, zone_id, family_id, label, active, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, zone_id, req.familyId, label, active ?? true, sort_order ?? 0]
  )
  res.json({ id })
})

router.put('/micro-zones/:id', requireParent, async (req, res) => {
  const { label, active, sort_order } = req.body
  await db.query(
    `UPDATE micro_zones SET label=$1, active=$2, sort_order=$3
     WHERE id=$4 AND family_id=$5`,
    [label, active ?? true, sort_order ?? 0, req.params.id, req.familyId]
  )
  res.json({ success: true })
})

router.delete('/micro-zones/:id', requireParent, async (req, res) => {
  await db.query(`DELETE FROM micro_zones WHERE id=$1 AND family_id=$2`, [req.params.id, req.familyId])
  res.json({ success: true })
})

// ── Assignments ───────────────────────────────────────────────────────────────

// Lazy auto-assigns if no auto assignments exist for the week yet
router.get('/assignments', async (req, res) => {
  const { date } = req.query
  if (!date) return res.status(400).json({ error: 'date required' })

  const weekOf = getMondayOf(date)

  const { rows: existing } = await db.query(
    `SELECT id FROM zone_assignments WHERE family_id=$1 AND week_of=$2 AND is_auto=true`,
    [req.familyId, weekOf]
  )
  if (existing.length === 0) {
    await autoAssignWeek(req.familyId, weekOf)
  }

  const assignments = await getAssignmentsWithDetails(req.familyId, weekOf)
  res.json({ weekOf, assignments })
})

// Manual additional assignment
router.post('/assignments', requireParent, async (req, res) => {
  const { child_id, micro_zone_id, date } = req.body
  const weekOf = getMondayOf(date ?? new Date().toISOString().slice(0, 10))
  const id = nanoid()

  await db.query(
    `INSERT INTO zone_assignments (id, family_id, child_id, micro_zone_id, week_of, is_auto)
     VALUES ($1, $2, $3, $4, $5, false)`,
    [id, req.familyId, child_id, micro_zone_id, weekOf]
  )
  res.json({ id })
})

router.put('/assignments/:id', requireParent, async (req, res) => {
  const { micro_zone_id } = req.body
  await db.query(
    `UPDATE zone_assignments SET micro_zone_id=$1 WHERE id=$2 AND family_id=$3`,
    [micro_zone_id, req.params.id, req.familyId]
  )
  res.json({ success: true })
})

router.delete('/assignments/:id', requireParent, async (req, res) => {
  await db.query(
    `DELETE FROM zone_assignments WHERE id=$1 AND family_id=$2`,
    [req.params.id, req.familyId]
  )
  res.json({ success: true })
})

// ── Check-ins ─────────────────────────────────────────────────────────────────

router.get('/checks', async (req, res) => {
  const { date, child_id } = req.query
  if (!date || !child_id) return res.status(400).json({ error: 'date and child_id required' })

  const { rows } = await db.query(
    `SELECT assignment_id, period, completed
     FROM zone_check_log
     WHERE family_id=$1 AND child_id=$2 AND date=$3`,
    [req.familyId, child_id, date]
  )

  const checks = {}
  for (const row of rows) {
    checks[`${row.assignment_id}__${row.period}`] = row.completed
  }
  res.json({ date, checks })
})

router.post('/checks/toggle', async (req, res) => {
  const { date, child_id, assignment_id, period } = req.body
  if (!date || !child_id || !assignment_id || !period) {
    return res.status(400).json({ error: 'Missing params' })
  }

  await db.query(
    `INSERT INTO zone_check_log (family_id, child_id, assignment_id, date, period, completed, updated_at)
     VALUES ($1, $2, $3, $4, $5, true, NOW())
     ON CONFLICT (child_id, assignment_id, date, period)
     DO UPDATE SET completed = NOT zone_check_log.completed, updated_at = NOW()`,
    [req.familyId, child_id, assignment_id, date, period]
  )

  const { rows } = await db.query(
    `SELECT assignment_id, period, completed
     FROM zone_check_log
     WHERE family_id=$1 AND child_id=$2 AND date=$3`,
    [req.familyId, child_id, date]
  )

  const checks = {}
  for (const row of rows) {
    checks[`${row.assignment_id}__${row.period}`] = row.completed
  }
  res.json({ checks })
})

export default router

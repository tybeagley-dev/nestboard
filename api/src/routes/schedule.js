import { Router } from 'express'
import { db } from '../db/client.js'
import { requireFamily } from '../middleware/requireFamily.js'
import { requireParent } from '../middleware/requireParent.js'

const router = Router()
router.use(requireFamily)

router.get('/config', async (req, res) => {
  const { rows } = await db.query(
    'SELECT schedule_config FROM families WHERE id = $1',
    [req.familyId]
  )
  res.json(rows[0]?.schedule_config ?? {})
})

router.put('/config', requireParent, async (req, res) => {
  // Merge with existing config so partial saves (e.g. routines saves summer/breaks,
  // chores saves spinDays) don't wipe each other's fields.
  const { rows } = await db.query('SELECT schedule_config FROM families WHERE id = $1', [req.familyId])
  const current = rows[0]?.schedule_config ?? {}
  const { summer, disabledHolidays, breaks, spinDays } = req.body

  const config = {
    summer:           summer           !== undefined ? summer           : (current.summer ?? null),
    disabledHolidays: disabledHolidays !== undefined ? disabledHolidays : (current.disabledHolidays ?? []),
    breaks:           breaks           !== undefined ? breaks           : (current.breaks ?? []),
    spinDays:         spinDays         !== undefined ? spinDays         : current.spinDays,
  }

  await db.query(
    'UPDATE families SET schedule_config = $1 WHERE id = $2',
    [JSON.stringify(config), req.familyId]
  )
  res.json(config)
})

export default router

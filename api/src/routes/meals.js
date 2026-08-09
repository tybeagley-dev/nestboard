import { Router } from 'express'
import { db } from '../db/client.js'
import { requireFamily } from '../middleware/requireFamily.js'
import { broadcast } from './events.js'

const router = Router()

router.use(requireFamily)

router.get('/', async (req, res) => {
  const { rows } = await db.query(
    `SELECT * FROM meals WHERE family_id = $1 ORDER BY day`,
    [req.familyId]
  )
  res.json(rows)
})

// The primary key is (family_id, day), so before this any string was a new row —
// POST /meals/<random> in a loop created unbounded rows. Note this stays open to
// slug-level callers on purpose: MealPlan lets the kiosk edit the week, and
// requiring a parent here would break the fridge tablet.
const DAYS = new Set([
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
])
const FIELD_MAX_LENGTH = 120

router.post('/:day', async (req, res) => {
  const { main, note, lunch } = req.body
  const { day } = req.params

  if (!DAYS.has(day)) return res.status(400).json({ error: 'Unknown day' })
  for (const [label, value] of [['main', main], ['note', note], ['lunch', lunch]]) {
    if (value != null && String(value).length > FIELD_MAX_LENGTH) {
      return res.status(400).json({ error: `${label} must be ${FIELD_MAX_LENGTH} characters or fewer` })
    }
  }

  await db.query(
    `INSERT INTO meals (family_id, day, main, note, lunch) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (family_id, day) DO UPDATE SET main=$3, note=$4, lunch=$5`,
    [req.familyId, day, main ?? '', note ?? '', lunch ?? '']
  )
  broadcast('meals', {}, req.familyId)
  res.json({ success: true })
})

export default router

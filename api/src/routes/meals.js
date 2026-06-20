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

router.post('/:day', async (req, res) => {
  const { main, note, lunch } = req.body
  const { day } = req.params
  await db.query(
    `INSERT INTO meals (family_id, day, main, note, lunch) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (family_id, day) DO UPDATE SET main=$3, note=$4, lunch=$5`,
    [req.familyId, day, main ?? '', note ?? '', lunch ?? '']
  )
  broadcast('meals', {}, req.familyId)
  res.json({ success: true })
})

export default router

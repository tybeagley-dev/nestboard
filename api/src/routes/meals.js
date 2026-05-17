import { Router } from 'express'
import { db } from '../db/client.js'
import { broadcast } from './events.js'

const router = Router()

router.get('/', async (_req, res) => {
  const { rows } = await db.query(`SELECT * FROM meals ORDER BY day`)
  res.json(rows)
})

router.post('/:day', async (req, res) => {
  const { main, note, lunch } = req.body
  const { day } = req.params
  await db.query(
    `INSERT INTO meals (day, main, note, lunch) VALUES ($1,$2,$3,$4)
     ON CONFLICT (day) DO UPDATE SET main=$2, note=$3, lunch=$4`,
    [day, main ?? '', note ?? '', lunch ?? '']
  )
  broadcast('meals', {})
  res.json({ success: true })
})

export default router

import { Router } from 'express'
import { db } from '../db/client.js'
import { requireFamily } from '../middleware/requireFamily.js'
import { broadcast } from './events.js'

const router = Router()

router.use(requireFamily)

router.get('/', async (req, res) => {
  const { rows } = await db.query(
    `SELECT * FROM announcements WHERE family_id = $1 ORDER BY added_at ASC`,
    [req.familyId]
  )
  res.json(rows)
})

router.post('/', async (req, res) => {
  const { id, text } = req.body
  if (!id || !text) return res.status(400).json({ error: 'Missing params' })
  await db.query(
    `INSERT INTO announcements (id, family_id, text) VALUES ($1, $2, $3)`,
    [id, req.familyId, text]
  )
  broadcast('announcements', {})
  res.json({ success: true })
})

router.delete('/:id', async (req, res) => {
  const { rowCount } = await db.query(
    `DELETE FROM announcements WHERE id = $1 AND family_id = $2`,
    [req.params.id, req.familyId]
  )
  if (!rowCount) return res.status(404).json({ error: 'Announcement not found' })
  broadcast('announcements', {})
  res.json({ success: true })
})

export default router

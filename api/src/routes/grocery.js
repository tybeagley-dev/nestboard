import { Router } from 'express'
import { db } from '../db/client.js'
import { requireFamily } from '../middleware/requireFamily.js'
import { broadcast } from './events.js'

const router = Router()

router.use(requireFamily)

router.get('/', async (req, res) => {
  const { rows } = await db.query(
    `SELECT * FROM grocery WHERE family_id = $1 ORDER BY added_at ASC`,
    [req.familyId]
  )
  res.json(rows)
})

router.post('/', async (req, res) => {
  const { id, item } = req.body
  if (!id || !item) return res.status(400).json({ error: 'Missing params' })
  await db.query(
    `INSERT INTO grocery (id, family_id, item) VALUES ($1, $2, $3)`,
    [id, req.familyId, item]
  )
  broadcast('grocery', {}, req.familyId)
  res.json({ success: true })
})

router.delete('/', async (req, res) => {
  await db.query(`DELETE FROM grocery WHERE family_id = $1`, [req.familyId])
  broadcast('grocery', {}, req.familyId)
  res.json({ success: true })
})

router.delete('/:id', async (req, res) => {
  const { rowCount } = await db.query(
    `DELETE FROM grocery WHERE id = $1 AND family_id = $2`,
    [req.params.id, req.familyId]
  )
  if (!rowCount) return res.status(404).json({ error: 'Item not found' })
  broadcast('grocery', {}, req.familyId)
  res.json({ success: true })
})

export default router

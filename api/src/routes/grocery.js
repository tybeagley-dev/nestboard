import { Router } from 'express'
import { db } from '../db/client.js'
import { broadcast } from './events.js'

const router = Router()

router.get('/', async (_req, res) => {
  const { rows } = await db.query(`SELECT * FROM grocery ORDER BY added_at ASC`)
  res.json(rows)
})

router.post('/', async (req, res) => {
  const { id, item } = req.body
  if (!id || !item) return res.status(400).json({ error: 'Missing params' })
  await db.query(`INSERT INTO grocery (id, item) VALUES ($1, $2)`, [id, item])
  broadcast('grocery', {})
  res.json({ success: true })
})

router.delete('/', async (_req, res) => {
  await db.query(`DELETE FROM grocery`)
  broadcast('grocery', {})
  res.json({ success: true })
})

router.delete('/:id', async (req, res) => {
  const { rowCount } = await db.query(`DELETE FROM grocery WHERE id = $1`, [req.params.id])
  if (!rowCount) return res.status(404).json({ error: 'Item not found' })
  broadcast('grocery', {})
  res.json({ success: true })
})

export default router

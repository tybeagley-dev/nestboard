import { Router } from 'express'
import { db } from '../db/client.js'
import { broadcast } from './events.js'

const router = Router()

router.get('/', async (_req, res) => {
  const { rows } = await db.query(`SELECT * FROM notes ORDER BY added_at ASC`)
  res.json(rows)
})

router.post('/', async (req, res) => {
  const { id, text } = req.body
  if (!id || !text) return res.status(400).json({ error: 'Missing params' })
  await db.query(`INSERT INTO notes (id, text) VALUES ($1, $2)`, [id, text])
  broadcast('notes', {})
  res.json({ success: true })
})

router.delete('/:id', async (req, res) => {
  const { rowCount } = await db.query(`DELETE FROM notes WHERE id = $1`, [req.params.id])
  if (!rowCount) return res.status(404).json({ error: 'Note not found' })
  broadcast('notes', {})
  res.json({ success: true })
})

export default router

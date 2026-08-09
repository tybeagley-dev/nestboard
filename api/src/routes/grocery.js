import { Router } from 'express'
import { nanoid } from 'nanoid'
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

export const ITEM_MAX_LENGTH = 120

router.post('/', async (req, res) => {
  const { item } = req.body
  if (typeof item !== 'string') return res.status(400).json({ error: 'Missing params' })

  const trimmed = item.trim()
  if (!trimmed) return res.status(400).json({ error: 'Item cannot be empty' })
  if (trimmed.length > ITEM_MAX_LENGTH) {
    return res.status(400).json({ error: `Item must be ${ITEM_MAX_LENGTH} characters or fewer` })
  }

  // Server-generated: the id used to come from the request body, so a colliding
  // id threw a primary-key error the caller saw as a 500, and it doubled as an
  // oracle for whether an id existed in some other family.
  const id = `g_${nanoid(12)}`
  await db.query(
    `INSERT INTO grocery (id, family_id, item) VALUES ($1, $2, $3)`,
    [id, req.familyId, trimmed]
  )
  broadcast('grocery', {}, req.familyId)
  res.status(201).json({ success: true, id })
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

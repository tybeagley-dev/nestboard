import { Router } from 'express'
import { db } from '../db/client.js'
import { requireFamily } from '../middleware/requireFamily.js'
import { requireParent } from '../middleware/requireParent.js'

const router = Router()
router.use(requireFamily)

router.get('/', async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, name, color, emoji, sort_order
     FROM children
     WHERE family_id = $1
     ORDER BY sort_order`,
    [req.familyId]
  )
  res.json(rows)
})

router.post('/', requireParent, async (req, res) => {
  const { name, color, emoji } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'name required' })

  const { rows: existing } = await db.query(
    `SELECT MAX(sort_order) AS max_order FROM children WHERE family_id = $1`,
    [req.familyId]
  )
  const sortOrder = (existing[0].max_order ?? -1) + 1
  const id = name.trim().toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()

  const { rows } = await db.query(
    `INSERT INTO children (id, family_id, name, color, emoji, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, color, emoji, sort_order`,
    [id, req.familyId, name.trim(), color ?? '#888888', emoji ?? '👤', sortOrder]
  )
  res.json(rows[0])
})

router.put('/:id', requireParent, async (req, res) => {
  const { name, color, emoji, sort_order } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'name required' })

  const { rows } = await db.query(
    `UPDATE children SET name=$1, color=$2, emoji=$3, sort_order=COALESCE($4, sort_order)
     WHERE id=$5 AND family_id=$6
     RETURNING id, name, color, emoji, sort_order`,
    [name.trim(), color ?? '#888888', emoji ?? '👤', sort_order ?? null, req.params.id, req.familyId]
  )
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' })
  res.json(rows[0])
})

router.delete('/:id', requireParent, async (req, res) => {
  await db.query(
    `DELETE FROM children WHERE id = $1 AND family_id = $2`,
    [req.params.id, req.familyId]
  )
  res.json({ success: true })
})

export default router

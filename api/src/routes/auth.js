import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { db } from '../db/client.js'
import { requireFamily } from '../middleware/requireFamily.js'

const router = Router()

// POST /auth/parent  { pin } → { token } — legacy single-family support
// Token is the raw PIN; requireParent now bcrypt-compares it against the DB hash.
router.post('/parent', (req, res) => {
  const { pin } = req.body
  if (!pin) return res.status(400).json({ error: 'Missing pin' })
  res.json({ token: pin })
})

// POST /auth/login  { slug, pin } → { familyId, name }
router.post('/login', async (req, res) => {
  const { slug, pin } = req.body
  if (!slug || !pin) return res.status(400).json({ error: 'Missing slug or pin' })
  try {
    const { rows } = await db.query(
      'SELECT id, name, parent_pin_hash FROM families WHERE slug = $1',
      [slug]
    )
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' })
    const valid = await bcrypt.compare(pin, rows[0].parent_pin_hash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })
    res.json({ familyId: rows[0].id, name: rows[0].name })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /auth/family  → { id, name } for the resolved slug
router.get('/family', requireFamily, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, name FROM families WHERE id = $1',
      [req.familyId]
    )
    res.json(rows[0] ?? null)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router

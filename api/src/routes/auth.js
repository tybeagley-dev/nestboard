import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { getAuth, clerkClient } from '@clerk/express'
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

// GET /auth/family  → { id, name } | { familyId: null } for new users (no membership yet)
router.get('/family', async (req, res) => {
  const { userId } = getAuth(req)

  if (userId) {
    try {
      // Upsert the user record so we always have a local mirror
      const clerkUser = await clerkClient().users.getUser(userId)
      const email = clerkUser.emailAddresses[0]?.emailAddress ?? ''
      await db.query(
        `INSERT INTO users (id, email) VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email`,
        [userId, email]
      )

      const { rows } = await db.query(
        `SELECT f.id, f.name FROM families f
         JOIN family_memberships fm ON fm.family_id = f.id
         WHERE fm.user_id = $1`,
        [userId]
      )
      if (!rows.length) return res.json({ familyId: null })
      res.json(rows[0])
    } catch (err) {
      res.status(500).json({ error: 'Server error' })
    }
    return
  }

  // Dev fallback: slug-based resolution
  const slug = req.headers['x-family-slug'] ?? process.env.DEFAULT_FAMILY_SLUG
  if (!slug) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const { rows } = await db.query('SELECT id, name FROM families WHERE slug = $1', [slug])
    res.json(rows[0] ?? null)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router

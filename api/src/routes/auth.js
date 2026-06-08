import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
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
      const clerkUser = await clerkClient.users.getUser(userId)
      const email = clerkUser.emailAddresses[0]?.emailAddress ?? ''
      await db.query(
        `INSERT INTO users (id, email) VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email`,
        [userId, email]
      )

      const { rows } = await db.query(
        `SELECT f.id, f.name, f.slug FROM families f
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
    const { rows } = await db.query('SELECT id, name, slug FROM families WHERE slug = $1', [slug])
    res.json(rows[0] ?? null)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /families  { name, pin } → { id, name, slug }  — requires Clerk auth
router.post('/families', async (req, res) => {
  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const { name, pin } = req.body
  if (!name?.trim() || !pin?.trim()) return res.status(400).json({ error: 'Missing name or pin' })

  try {
    const existing = await db.query(
      'SELECT family_id FROM family_memberships WHERE user_id = $1',
      [userId]
    )
    if (existing.rows.length) return res.status(409).json({ error: 'Already in a family' })

    const familyId = `fam_${nanoid(10)}`
    const slug     = nanoid(12)
    const hash     = await bcrypt.hash(pin.trim(), 12)

    await db.query(
      `INSERT INTO families (id, name, slug, parent_pin_hash) VALUES ($1, $2, $3, $4)`,
      [familyId, name.trim(), slug, hash]
    )
    await db.query(
      `INSERT INTO family_memberships (user_id, family_id, role) VALUES ($1, $2, 'owner')`,
      [userId, familyId]
    )

    res.status(201).json({ id: familyId, name: name.trim(), slug })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /families/join  { slug, pin } → { id, name, slug }  — requires Clerk auth
router.post('/families/join', async (req, res) => {
  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const { slug, pin } = req.body
  if (!slug?.trim() || !pin?.trim()) return res.status(400).json({ error: 'Missing slug or pin' })

  try {
    const existing = await db.query(
      'SELECT family_id FROM family_memberships WHERE user_id = $1',
      [userId]
    )
    if (existing.rows.length) return res.status(409).json({ error: 'Already in a family' })

    const { rows } = await db.query(
      'SELECT id, name, slug, parent_pin_hash FROM families WHERE slug = $1',
      [slug.trim()]
    )
    if (!rows.length) return res.status(401).json({ error: 'Invalid family code or PIN' })

    const valid = await bcrypt.compare(pin.trim(), rows[0].parent_pin_hash)
    if (!valid) return res.status(401).json({ error: 'Invalid family code or PIN' })

    await db.query(
      `INSERT INTO family_memberships (user_id, family_id, role) VALUES ($1, $2, 'parent')
       ON CONFLICT DO NOTHING`,
      [userId, rows[0].id]
    )

    res.json({ id: rows[0].id, name: rows[0].name, slug: rows[0].slug })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router

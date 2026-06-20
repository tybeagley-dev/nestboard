import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import { getAuth, clerkClient } from '@clerk/express'
import { db } from '../db/client.js'
import { requireFamily } from '../middleware/requireFamily.js'

const router = Router()

// POST /auth/parent  { pin } → { token } — validates the PIN against the
// requesting family's stored hash. Family is resolved via requireFamily (Clerk
// membership or x-family-slug). On success the raw PIN is the parent token;
// requireParent bcrypt-compares it against the DB hash on later writes.
router.post('/parent', (req, res) => {
  requireFamily(req, res, async () => {
    const { pin } = req.body ?? {}
    if (!pin) return res.status(400).json({ error: 'Missing pin' })
    try {
      const { rows } = await db.query(
        'SELECT parent_pin_hash FROM families WHERE id = $1',
        [req.familyId]
      )
      if (!rows.length || !await bcrypt.compare(pin, rows[0].parent_pin_hash)) {
        return res.status(401).json({ error: 'Invalid PIN' })
      }
      res.json({ token: pin })
    } catch (err) {
      res.status(500).json({ error: 'Server error' })
    }
  })
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
        `SELECT f.id, f.name, f.slug, f.labels, f.onboarded, f.weather FROM families f
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
    const { rows } = await db.query('SELECT id, name, slug, labels, onboarded, weather FROM families WHERE slug = $1', [slug])
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

// PUT /auth/family/labels { tokenName, tokenNameSingular, rewardsName }
// Stores only non-empty values — blanks fall back to the generic defaults in the UI.
router.put('/family/labels', async (req, res) => {
  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })
  const { tokenName, tokenNameSingular, rewardsName } = req.body ?? {}
  const labels = {}
  if (tokenName?.trim())         labels.tokenName = tokenName.trim()
  if (tokenNameSingular?.trim()) labels.tokenNameSingular = tokenNameSingular.trim()
  if (rewardsName?.trim())       labels.rewardsName = rewardsName.trim()
  try {
    const { rows } = await db.query('SELECT family_id FROM family_memberships WHERE user_id = $1', [userId])
    if (!rows.length) return res.status(404).json({ error: 'No family' })
    await db.query('UPDATE families SET labels = $1 WHERE id = $2', [JSON.stringify(labels), rows[0].family_id])
    res.json({ success: true, labels })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT /auth/family/weather  { lat, lon, label } → sets the family's forecast location
router.put('/family/weather', async (req, res) => {
  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })
  const { lat, lon, label } = req.body ?? {}
  if (typeof lat !== 'number' || typeof lon !== 'number' || !label?.trim()) {
    return res.status(400).json({ error: 'Missing lat, lon, or label' })
  }
  const weather = { lat, lon, label: label.trim() }
  try {
    const { rows } = await db.query('SELECT family_id FROM family_memberships WHERE user_id = $1', [userId])
    if (!rows.length) return res.status(404).json({ error: 'No family' })
    await db.query('UPDATE families SET weather = $1 WHERE id = $2', [JSON.stringify(weather), rows[0].family_id])
    res.json({ success: true, weather })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /auth/family/complete-onboarding → mark the authed user's family onboarded
router.post('/family/complete-onboarding', async (req, res) => {
  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const { rows } = await db.query(
      'SELECT family_id FROM family_memberships WHERE user_id = $1',
      [userId]
    )
    if (!rows.length) return res.status(404).json({ error: 'No family' })
    await db.query('UPDATE families SET onboarded = true WHERE id = $1', [rows[0].family_id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// ── Family members & invites ────────────────────────────────────────────────

// Resolve the caller's family_id from their membership; null if none.
async function callerFamilyId(userId) {
  const { rows } = await db.query('SELECT family_id FROM family_memberships WHERE user_id = $1', [userId])
  return rows.length ? rows[0].family_id : null
}

// GET /auth/family/members → [{ user_id, email, role }]
router.get('/family/members', async (req, res) => {
  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const familyId = await callerFamilyId(userId)
    if (!familyId) return res.status(404).json({ error: 'No family' })
    const { rows } = await db.query(
      `SELECT fm.user_id, fm.role, u.email
       FROM family_memberships fm JOIN users u ON u.id = fm.user_id
       WHERE fm.family_id = $1
       ORDER BY (fm.role = 'owner') DESC, u.email`,
      [familyId]
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /auth/family/members/:targetId → remove a member (never the owner)
router.delete('/family/members/:targetId', async (req, res) => {
  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })
  const { targetId } = req.params
  try {
    const familyId = await callerFamilyId(userId)
    if (!familyId) return res.status(404).json({ error: 'No family' })
    const { rows } = await db.query(
      'SELECT role FROM family_memberships WHERE user_id = $1 AND family_id = $2',
      [targetId, familyId]
    )
    if (!rows.length) return res.status(404).json({ error: 'Not a member' })
    if (rows[0].role === 'owner') return res.status(403).json({ error: 'Cannot remove the owner' })
    await db.query('DELETE FROM family_memberships WHERE user_id = $1 AND family_id = $2', [targetId, familyId])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /auth/family/invites → { token } — single-use, 7-day invite for the caller's family
router.post('/family/invites', async (req, res) => {
  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const familyId = await callerFamilyId(userId)
    if (!familyId) return res.status(404).json({ error: 'No family' })
    const token = nanoid(16)
    await db.query(
      `INSERT INTO family_invites (token, family_id, role, created_by, expires_at)
       VALUES ($1, $2, 'parent', $3, NOW() + INTERVAL '7 days')`,
      [token, familyId, userId]
    )
    res.status(201).json({ token })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /auth/family/invites → active (unused, unexpired) invites for the caller's family
router.get('/family/invites', async (req, res) => {
  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const familyId = await callerFamilyId(userId)
    if (!familyId) return res.status(404).json({ error: 'No family' })
    const { rows } = await db.query(
      `SELECT token, role, created_at, expires_at, used_count, max_uses
       FROM family_invites
       WHERE family_id = $1 AND used_count < max_uses AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [familyId]
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /auth/family/invites/:token → revoke
router.delete('/family/invites/:token', async (req, res) => {
  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const familyId = await callerFamilyId(userId)
    if (!familyId) return res.status(404).json({ error: 'No family' })
    await db.query('DELETE FROM family_invites WHERE token = $1 AND family_id = $2', [req.params.token, familyId])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /auth/invites/:token → preview an invite before accepting (authed, any user)
router.get('/invites/:token', async (req, res) => {
  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const { rows } = await db.query(
      `SELECT fi.role, fi.expires_at, fi.used_count, fi.max_uses, f.name AS family_name
       FROM family_invites fi JOIN families f ON f.id = fi.family_id
       WHERE fi.token = $1`,
      [req.params.token]
    )
    if (!rows.length) return res.status(404).json({ error: 'Invite not found' })
    const inv = rows[0]
    const valid = inv.used_count < inv.max_uses && new Date(inv.expires_at) > new Date()
    res.json({ familyName: inv.family_name, role: inv.role, valid })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /auth/invites/:token/accept → join the invite's family
router.post('/invites/:token/accept', async (req, res) => {
  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })
  try {
    // Mirror the Clerk user locally so the membership FK is satisfied.
    const clerkUser = await clerkClient.users.getUser(userId)
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? ''
    await db.query(
      `INSERT INTO users (id, email) VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email`,
      [userId, email]
    )

    const existing = await db.query('SELECT family_id FROM family_memberships WHERE user_id = $1', [userId])
    if (existing.rows.length) return res.status(409).json({ error: 'Already in a family' })

    const { rows } = await db.query(
      `SELECT fi.family_id, fi.role, fi.used_count, fi.max_uses, fi.expires_at, f.name, f.slug
       FROM family_invites fi JOIN families f ON f.id = fi.family_id
       WHERE fi.token = $1`,
      [req.params.token]
    )
    if (!rows.length) return res.status(404).json({ error: 'Invite not found' })
    const inv = rows[0]
    if (inv.used_count >= inv.max_uses || new Date(inv.expires_at) <= new Date()) {
      return res.status(410).json({ error: 'Invite expired or already used' })
    }

    await db.query(
      `INSERT INTO family_memberships (user_id, family_id, role) VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [userId, inv.family_id, inv.role]
    )
    await db.query(
      'UPDATE family_invites SET used_count = used_count + 1, used_at = NOW() WHERE token = $1',
      [req.params.token]
    )
    res.json({ id: inv.family_id, name: inv.name, slug: inv.slug })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router

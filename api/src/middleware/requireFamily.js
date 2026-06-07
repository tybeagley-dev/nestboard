import { getAuth } from '@clerk/express'
import { db } from '../db/client.js'

export async function requireFamily(req, res, next) {
  const { userId } = getAuth(req)

  if (userId) {
    try {
      const { rows } = await db.query(
        'SELECT family_id FROM family_memberships WHERE user_id = $1',
        [userId]
      )
      if (!rows.length) return res.status(404).json({ error: 'No family found', code: 'NO_FAMILY' })
      req.familyId = rows[0].family_id
      req.userId = userId
      return next()
    } catch (err) {
      return next(err)
    }
  }

  // Dev fallback: x-family-slug header or DEFAULT_FAMILY_SLUG env var
  const slug = req.headers['x-family-slug'] ?? process.env.DEFAULT_FAMILY_SLUG
  if (!slug) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const { rows } = await db.query('SELECT id FROM families WHERE slug = $1', [slug])
    if (!rows.length) return res.status(401).json({ error: 'Unknown family' })
    req.familyId = rows[0].id
    next()
  } catch (err) {
    next(err)
  }
}

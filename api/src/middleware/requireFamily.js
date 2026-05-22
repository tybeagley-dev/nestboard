import { db } from '../db/client.js'

export async function requireFamily(req, res, next) {
  const slug = req.headers['x-family-slug'] ?? process.env.DEFAULT_FAMILY_SLUG
  if (!slug) return res.status(401).json({ error: 'Missing family' })
  try {
    const { rows } = await db.query('SELECT id FROM families WHERE slug = $1', [slug])
    if (!rows.length) return res.status(401).json({ error: 'Unknown family' })
    req.familyId = rows[0].id
    next()
  } catch (err) {
    next(err)
  }
}

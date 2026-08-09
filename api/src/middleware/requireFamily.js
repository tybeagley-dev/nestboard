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

  // Slug auth, for the surfaces that cannot hold a Clerk session: the kiosk and
  // the child views. The slug is a bearer credential in a URL — it never expires,
  // can't be rotated without breaking every installed PWA, and is one secret for
  // the whole family. Treat it as LOW TRUST: anything exposing a secret (calendar
  // URLs, invites, members) or spending a parent's authority must sit behind
  // requireParent, not this. See NEXT_UP "slug-as-credential".
  //
  // DEFAULT_FAMILY_SLUG is deliberately gone — an unset-by-accident env var must
  // never grant a family to an unauthenticated caller.
  const slug = req.headers['x-family-slug']
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

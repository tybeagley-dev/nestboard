import bcrypt from 'bcryptjs'
import { getAuth } from '@clerk/express'
import { db } from '../db/client.js'
import { requireFamily } from './requireFamily.js'

// Parent authorization. Primary path: a Clerk-authenticated owner/parent of this
// family. Fallback: the family PIN token, for shared/no-login devices (the fridge
// kiosk, child views) where there's no Clerk session.
export function requireParent(req, res, next) {
  requireFamily(req, res, async () => {
    try {
      const { userId } = getAuth(req)
      if (userId) {
        const { rows } = await db.query(
          `SELECT 1 FROM family_memberships
           WHERE user_id = $1 AND family_id = $2 AND role IN ('owner', 'parent')`,
          [userId, req.familyId]
        )
        if (rows.length) return next()
      }

      // Fallback: parent PIN token
      const token = req.headers['x-parent-token']
      if (!token) return res.status(401).json({ error: 'Unauthorized' })
      const { rows } = await db.query(
        'SELECT parent_pin_hash FROM families WHERE id = $1',
        [req.familyId]
      )
      if (!rows.length || !await bcrypt.compare(token, rows[0].parent_pin_hash)) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      next()
    } catch (err) {
      next(err)
    }
  })
}

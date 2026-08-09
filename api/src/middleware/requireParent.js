import { getAuth } from '@clerk/express'
import { db } from '../db/client.js'
import { requireFamily } from './requireFamily.js'
import { verifyParentToken } from '../utils/parentTokens.js'

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

      // Fallback: a parent session token from POST /auth/parent. This used to be
      // the raw PIN, bcrypt-compared here on every request — so the PIN rode the
      // wire constantly and could be ground against this path without the
      // /auth/parent lockout ever seeing it. The token is opaque, expiring, and
      // scoped to the family it was issued for.
      const token = req.headers['x-parent-token']
      if (!verifyParentToken(token, req.familyId)) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      next()
    } catch (err) {
      next(err)
    }
  })
}

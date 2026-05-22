import bcrypt from 'bcryptjs'
import { db } from '../db/client.js'
import { requireFamily } from './requireFamily.js'

export function requireParent(req, res, next) {
  requireFamily(req, res, async () => {
    const token = req.headers['x-parent-token']
    if (!token) return res.status(401).json({ error: 'Unauthorized' })
    try {
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

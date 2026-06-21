import { getAuth } from '@clerk/express'

// Super-admin gate. ADMIN_USER_IDS is a comma-separated list of Clerk user ids
// (set in api/.env locally, Railway env in prod). Empty = nobody is admin.
const ADMIN_IDS = (process.env.ADMIN_USER_IDS ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

export function requireAdmin(req, res, next) {
  const { userId } = getAuth(req)
  if (!userId || !ADMIN_IDS.includes(userId)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  req.userId = userId
  next()
}

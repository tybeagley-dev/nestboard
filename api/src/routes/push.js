import { Router } from 'express'
import { db } from '../db/client.js'
import { requireFamily } from '../middleware/requireFamily.js'
import { safeFetchUrl } from '../utils/safeUrl.js'

const router = Router()
router.use(requireFamily)

// POST /push/subscribe  { endpoint, keys: { p256dh, auth }, childId? }
router.post('/subscribe', async (req, res) => {
  const { endpoint, keys, childId } = req.body
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Missing subscription fields' })
  }
  // web-push POSTs to whatever is stored here, so an unvalidated endpoint turns
  // every notification into a request at a target of the caller's choosing.
  // Real push services are always public https.
  if (!safeFetchUrl(endpoint)) {
    return res.status(400).json({ error: 'Invalid push endpoint' })
  }

  await db.query(
    `INSERT INTO push_subscriptions (family_id, child_id, endpoint, p256dh, auth)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (family_id, endpoint) DO UPDATE
       SET p256dh = $4, auth = $5, child_id = $2`,
    [req.familyId, childId ?? null, endpoint, keys.p256dh, keys.auth]
  )
  res.json({ success: true })
})

// DELETE /push/subscribe  { endpoint }
router.delete('/subscribe', async (req, res) => {
  const { endpoint } = req.body
  if (!endpoint) return res.status(400).json({ error: 'Missing endpoint' })
  await db.query(
    `DELETE FROM push_subscriptions WHERE family_id = $1 AND endpoint = $2`,
    [req.familyId, endpoint]
  )
  res.json({ success: true })
})

export default router

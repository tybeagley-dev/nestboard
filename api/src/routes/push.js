import { Router } from 'express'
import { db } from '../db/client.js'
import { requireFamily } from '../middleware/requireFamily.js'
import { safeFetchUrl } from '../utils/safeUrl.js'

const router = Router()
router.use(requireFamily)

// POST /push/subscribe  { endpoint, keys: { p256dh, auth } }
//
// Parent subscriptions only. A childId used to be accepted here and stored on
// the row, making the endpoint a direct channel to a named child — see the note
// in utils/push.js and migration 032. Any childId in the body is now ignored
// rather than rejected, so an installed PWA running stale JS degrades to a
// parent subscription instead of failing to subscribe at all.
router.post('/subscribe', async (req, res) => {
  const { endpoint, keys } = req.body
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
    `INSERT INTO push_subscriptions (family_id, endpoint, p256dh, auth)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (family_id, endpoint) DO UPDATE
       SET p256dh = $3, auth = $4`,
    [req.familyId, endpoint, keys.p256dh, keys.auth]
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

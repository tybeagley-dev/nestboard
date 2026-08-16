import webpush from 'web-push'
import { db } from '../db/client.js'

let vapidConfigured = false
let vapidChecked = false
function ensureVapid() {
  if (vapidChecked) return
  vapidChecked = true
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return
  // Invalid keys must disable push, never crash the API (notify* is fire-and-forget).
  try {
    webpush.setVapidDetails(
      'mailto:tybeagley.dev@gmail.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    )
    vapidConfigured = true
  } catch (err) {
    console.warn('Push notifications disabled — invalid VAPID config:', err.message)
  }
}

// Send to every subscription for a family. Parents are the only audience: a push
// endpoint on a child's own device is a channel for contacting that child
// directly, which is personal information under COPPA and outside the "support
// for internal operations" exemption that covers our device tokens. The two
// notifications children used to get ("Chore approved!", "Screen time
// approved!") were confirmations of a parent action that SSE already pushes to
// the open board, so the feature bought very little and carried the obligation.
// See migration 032. Do not reintroduce a child-scoped audience without
// verifiable parental consent for it.
//
// Parent notifications are always "something needs your attention", and the
// parent portal opens on the approvals tab by default — so tapping one lands
// where the work is instead of on the dashboard. The service worker reads
// data.url; a caller can override it for a notification that isn't an approval.
export async function notifyParent(familyId, payload) {
  await notifySubscriptions(familyId, { url: '/parent', ...payload })
}

async function notifySubscriptions(familyId, payload) {
  ensureVapid()
  if (!vapidConfigured) return

  const { rows } = await db.query(
    `SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE family_id = $1`,
    [familyId]
  )

  await Promise.all(rows.map(async sub => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
    } catch (err) {
      // 410 Gone = subscription expired, clean it up
      if (err.statusCode === 410) {
        await db.query(`DELETE FROM push_subscriptions WHERE id = $1`, [sub.id])
      }
    }
  }))
}

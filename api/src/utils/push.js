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

// Send to all parent subscriptions for a family (child_id IS NULL)
export async function notifyParent(familyId, payload) {
  await notifySubscriptions(familyId, null, payload)
}

// Send to all subscriptions for a specific child
export async function notifyChild(familyId, childId, payload) {
  await notifySubscriptions(familyId, childId, payload)
}

async function notifySubscriptions(familyId, childId, payload) {
  ensureVapid()
  if (!vapidConfigured) return

  const { rows } = childId
    ? await db.query(
        `SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE family_id = $1 AND child_id = $2`,
        [familyId, childId]
      )
    : await db.query(
        `SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE family_id = $1 AND child_id IS NULL`,
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

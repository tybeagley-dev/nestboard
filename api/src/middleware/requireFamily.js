import { getAuth } from '@clerk/express'
import { db } from '../db/client.js'
import { verifyDeviceToken, touchDevice } from '../utils/deviceTokens.js'

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

  // Device tokens, for the surfaces that cannot hold a Clerk session: the kiosk
  // and the child views. A parent pairs the device in person with the family PIN
  // (POST /auth/device/pair) and it holds an opaque, revocable credential from
  // then on. This replaced slug auth — see migration 031.
  const deviceToken = req.headers['x-device-token']
  if (deviceToken) {
    try {
      const device = await verifyDeviceToken(deviceToken)
      // DEVICE_REVOKED is load-bearing on the client: it tells a kiosk to drop
      // its stored token and show the pairing prompt, rather than sit on a board
      // it can no longer refresh.
      if (!device) return res.status(401).json({ error: 'Unauthorized', code: 'DEVICE_REVOKED' })
      touchDevice(device)
      req.familyId = device.family_id
      req.deviceId = device.id
      return next()
    } catch (err) {
      return next(err)
    }
  }

  // Slug auth is GONE. It used to live here, and the slug is in the URL of every
  // kiosk and child page — so anyone who saw a link held a permanent, unrevocable
  // credential for the whole family, and the PIN gate in front of those views was
  // deterrence rather than access control. The slug now identifies a family only
  // where it cannot authorize anything on its own: POST /auth/device/pair, which
  // still demands the PIN, and POST /auth/login.
  //
  // Do not reintroduce a slug fallback here. A fallback would mean a revoked
  // device keeps working off the slug still sitting in its address bar, which
  // makes every Remove button in the Devices tab a lie.
  return res.status(401).json({ error: 'Unauthorized' })
}

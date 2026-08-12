import { createHash, randomBytes } from 'crypto'
import { nanoid } from 'nanoid'
import { db } from '../db/client.js'

// Per-device credentials for the kiosk and child views. See migration 031 for
// why these exist and why the hash is SHA-256 rather than bcrypt.
//
// Unlike parent tokens (in-memory, 30 minutes) these are DB-backed and do not
// expire. They live on devices nobody ever touches — a fridge display, a tablet
// in a bedroom — so any expiry is a scheduled outage that a parent has to walk
// around the house to clear. Revocation is the property we actually wanted.

const hash = token => createHash('sha256').update(token).digest('hex')

// Rewriting last_seen_at on every request would mean a write per API call for a
// display that polls all day. An hour's resolution is plenty for "is this device
// still out there".
const LAST_SEEN_STALE_MS = 60 * 60 * 1000

export async function issueDeviceToken(familyId, { label, kind, childId, userAgent }) {
  const token = randomBytes(32).toString('base64url')
  const id = `dev_${nanoid(12)}`
  await db.query(
    `INSERT INTO device_tokens (id, family_id, token_hash, label, kind, child_id, user_agent, last_seen_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [id, familyId, hash(token), label, kind, childId ?? null, userAgent?.slice(0, 300) ?? null]
  )
  return { id, token }
}

// Returns the device row, or null when the token is unknown or revoked. Callers
// treat null as "not authenticated" — there is no distinction here between a
// token that never existed and one a parent removed, and the client is told the
// same thing either way so a stale link can't learn which it is holding.
export async function verifyDeviceToken(token) {
  if (!token || typeof token !== 'string') return null
  const { rows } = await db.query(
    `SELECT id, family_id, last_seen_at FROM device_tokens
      WHERE token_hash = $1 AND revoked_at IS NULL`,
    [hash(token)]
  )
  return rows[0] ?? null
}

// Fire-and-forget: a failure here must never fail the request it rode in on.
export function touchDevice(device) {
  const seen = device.last_seen_at ? new Date(device.last_seen_at).getTime() : 0
  if (Date.now() - seen < LAST_SEEN_STALE_MS) return
  db.query('UPDATE device_tokens SET last_seen_at = NOW() WHERE id = $1', [device.id])
    .catch(err => console.warn('touchDevice failed:', err.message))
}

export function listDevices(familyId) {
  return db.query(
    `SELECT id, label, kind, child_id, user_agent, created_at, last_seen_at
       FROM device_tokens
      WHERE family_id = $1 AND revoked_at IS NULL
      ORDER BY created_at`,
    [familyId]
  ).then(r => r.rows)
}

// Scoped by family_id as well as id so a device id from one family can never
// revoke another's, even if one leaked.
export function revokeDevice(familyId, id) {
  return db.query(
    `UPDATE device_tokens SET revoked_at = NOW()
      WHERE id = $1 AND family_id = $2 AND revoked_at IS NULL`,
    [id, familyId]
  ).then(r => r.rowCount)
}

// The button for the case people reach for the PIN hoping it will do this: a
// lost tablet, or a kid who worked the code out. Every device drops back to the
// pairing prompt and the ones still in the house get paired again.
export function revokeAllDevices(familyId) {
  return db.query(
    'UPDATE device_tokens SET revoked_at = NOW() WHERE family_id = $1 AND revoked_at IS NULL',
    [familyId]
  ).then(r => r.rowCount)
}

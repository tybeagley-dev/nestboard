import { randomBytes } from 'crypto'

// Server-issued parent session tokens.
//
// POST /auth/parent used to verify the PIN and then hand the PIN itself back as
// the token, which the client sent as x-parent-token on every parent write. Two
// consequences: the family PIN travelled the wire constantly, so anyone with
// devtools open on the kiosk could read it off a single approval; and
// requireParent bcrypt-compared it (cost 12) on every one of those requests.
//
// It also meant the PIN was directly usable as a bearer token, so the lockout on
// /auth/parent could be sidestepped by grinding x-parent-token against any
// parent endpoint instead — a path the lockout never saw.
//
// The token is now opaque, random and short-lived. The PIN is sent exactly once,
// when unlocking.
//
// In memory, consistent with the SSE tickets and the PIN lockout: a restart
// costs a parent one re-unlock. Revisit if the API runs more than one instance.

// The kiosk's own unlock window is 3 minutes (ParentPage TIMEOUT_MS), which
// re-prompts and mints a fresh token. This is deliberately looser so a parent
// working through a batch of approvals is never cut off by a server-side expiry
// the UI has no idea about.
const TTL_MS = 30 * 60 * 1000

const tokens = new Map() // token -> { familyId, expiresAt }

export function issueParentToken(familyId) {
  const token = randomBytes(32).toString('base64url')
  tokens.set(token, { familyId, expiresAt: Date.now() + TTL_MS })
  return token
}

export function verifyParentToken(token, familyId) {
  if (!token) return false
  const entry = tokens.get(token)
  if (!entry) return false
  if (entry.expiresAt <= Date.now()) {
    tokens.delete(token)
    return false
  }
  // Scoped to the family it was issued for, so a token from one family can never
  // authorize a write against another.
  return entry.familyId === familyId
}

// Changing the PIN must invalidate every session it granted — otherwise a device
// that was unlocked before the change keeps parent rights, which is exactly what
// someone changing the PIN is usually trying to stop.
export function revokeFamilyParentTokens(familyId) {
  for (const [token, entry] of tokens) {
    if (entry.familyId === familyId) tokens.delete(token)
  }
}

setInterval(() => {
  const now = Date.now()
  for (const [token, entry] of tokens) {
    if (entry.expiresAt <= now) tokens.delete(token)
  }
}, TTL_MS).unref?.()

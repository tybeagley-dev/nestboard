// Failed-PIN tracking, keyed by family rather than by IP.
//
// The family PIN is six digits — a million combinations — and it authorizes every
// parent write, the approvals queue, and (since calendars moved behind
// requireParent) the iCal URLs. The general 300/min IP limiter never applied to
// it: the strict 20/min limiter keys off the x-parent-token header, which the
// login endpoints don't send. That left roughly a day to walk the whole keyspace
// from one IP, and far less from several.
//
// Keyed by family because that's what's actually under attack. Per-IP is wrong in
// both directions here: one household shares an IP (so a family would rate-limit
// itself), while an attacker can trivially spread across many.
//
// In memory on purpose, same trade as the SSE tickets: a restart clears the
// counters, which costs an attacker more than it costs a locked-out parent, and
// it avoids a write to the database on every wrong keypress. Revisit if the API
// ever runs more than one instance.

const MAX_ATTEMPTS = 5

// Escalating lockouts. A parent mistyping their PIN waits a minute; something
// grinding the keyspace ends up at an hour per five guesses, which puts a
// million combinations comfortably out of reach.
const LOCKOUT_LADDER_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000]

const SWEEP_MS = 60 * 60_000

const attempts = new Map() // key -> { fails, lockLevel, lockedUntil, seenAt }

function entry(key) {
  let e = attempts.get(key)
  if (!e) {
    e = { fails: 0, lockLevel: 0, lockedUntil: 0, seenAt: Date.now() }
    attempts.set(key, e)
  }
  e.seenAt = Date.now()
  return e
}

// → { locked: boolean, retryAfterSec: number }
export function checkPinLock(key) {
  if (!key) return { locked: false, retryAfterSec: 0 }
  const e = attempts.get(key)
  if (!e || e.lockedUntil <= Date.now()) return { locked: false, retryAfterSec: 0 }
  return { locked: true, retryAfterSec: Math.ceil((e.lockedUntil - Date.now()) / 1000) }
}

export function recordPinFailure(key) {
  if (!key) return { locked: false, retryAfterSec: 0 }
  const e = entry(key)
  e.fails += 1
  if (e.fails >= MAX_ATTEMPTS) {
    const ms = LOCKOUT_LADDER_MS[Math.min(e.lockLevel, LOCKOUT_LADDER_MS.length - 1)]
    e.lockedUntil = Date.now() + ms
    e.lockLevel  += 1
    e.fails       = 0
    return { locked: true, retryAfterSec: Math.ceil(ms / 1000) }
  }
  return { locked: false, retryAfterSec: 0 }
}

// A correct PIN clears the failure count but deliberately NOT the lock ladder —
// otherwise one lucky guess mid-attack resets the escalation. The ladder decays
// on its own once the family stops failing (see the sweep).
export function recordPinSuccess(key) {
  const e = attempts.get(key)
  if (!e) return
  e.fails = 0
  e.lockedUntil = 0
}

setInterval(() => {
  const cutoff = Date.now() - SWEEP_MS
  for (const [k, e] of attempts) {
    if (e.seenAt < cutoff && e.lockedUntil <= Date.now()) attempts.delete(k)
  }
}, SWEEP_MS).unref?.()

export { MAX_ATTEMPTS }

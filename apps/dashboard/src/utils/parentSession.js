// The parent-panel unlock, shared by the gate itself (ParentPage) and by the
// gear on the dashboard, which now takes the PIN before navigating. Same pattern
// as utils/releases.js: the key and its rules live in one place rather than
// being a string two components have to agree on.
//
// sessionStorage, not localStorage — the unlock dies with the tab, so a kiosk
// left on the fridge doesn't stay unlocked indefinitely.
const SESSION_KEY = 'parent_unlocked_at'
const TIMEOUT_MS  = 3 * 60 * 1000

export function isParentUnlocked() {
  const ts = sessionStorage.getItem(SESSION_KEY)
  return !!ts && Date.now() - Number(ts) < TIMEOUT_MS
}

export function markParentUnlocked() {
  sessionStorage.setItem(SESSION_KEY, String(Date.now()))
}

export function lockParent() {
  sessionStorage.removeItem(SESSION_KEY)
}

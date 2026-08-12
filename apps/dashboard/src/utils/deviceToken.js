// Per-device credential for the kiosk and child views, stored per family slug.
//
// This replaces childTrust.js, which set a boolean the server never saw: a
// device was "trusted" only in its own opinion, and the API went on accepting
// the slug from anyone who had the URL. The PIN gate was deterrence, not access
// control. Now the same PIN moment trades the PIN for a real credential the
// server issued and can take back.
//
// No expiry, by design — these sit on displays nobody touches, so an expiry is
// just a scheduled outage. A parent removes a device from the Devices tab.
const key = slug => `nestboard_device_token_${slug}`

// The old trust flag. Devices carrying one hold no token, so they get the
// pairing prompt once — the expected one-time re-pair — and we drop the stale
// key on the way past so it can't be mistaken for state later.
const legacyKey = slug => `nestboard_child_trust_${slug}`

export function getDeviceToken(slug) {
  if (!slug) return null
  try {
    localStorage.removeItem(legacyKey(slug))
    return localStorage.getItem(key(slug))
  } catch {
    // Safari in private mode throws on localStorage. Pairing every load is a bad
    // experience but a working one; failing closed here would brick the view.
    return null
  }
}

export function storeDeviceToken(slug, token) {
  if (!slug || !token) return
  try { localStorage.setItem(key(slug), token) } catch { /* see above */ }
}

export function clearDeviceToken(slug) {
  if (!slug) return
  try {
    localStorage.removeItem(key(slug))
    localStorage.removeItem(legacyKey(slug))
  } catch { /* see above */ }
}

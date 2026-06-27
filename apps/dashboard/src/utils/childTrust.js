// Device-level, family-wide trust for the public child views. The child route
// (/:slug/child/:childId) is otherwise unauthenticated, so first open on a
// device shows a PIN gate; once the family PIN is entered we mark the device
// trusted for that family and skip the gate thereafter. Persistent (no expiry) —
// re-PIN only happens on cleared storage or a new device.
const key = slug => `nestboard_child_trust_${slug}`

export function isChildTrusted(slug) {
  return !!slug && !!localStorage.getItem(key(slug))
}

export function trustChild(slug) {
  if (slug) localStorage.setItem(key(slug), String(Date.now()))
}

export function untrustChild(slug) {
  if (slug) localStorage.removeItem(key(slug))
}

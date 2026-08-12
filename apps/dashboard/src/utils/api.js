import { CONFIG } from '../config/config'

let _getToken = null
let _familySlug = null
let _parentToken = null
let _deviceToken = null
let _onDeviceRevoked = () => {}

export function setTokenGetter(fn) {
  _getToken = fn
}

export function setFamilySlug(slug) {
  _familySlug = slug
}

// The verified parent PIN for this session, set by PinModal on unlock. Sent as
// x-parent-token so no-login kiosk devices authorize writes against the family's
// stored PIN; redundant (but harmless) when a Clerk parent session is present.
export function setParentToken(token) {
  _parentToken = token
}

// This device's paired credential, for the kiosk and child views. Set by those
// views at mount from localStorage; null everywhere else, where a Clerk session
// does the job instead.
export function setDeviceToken(token) {
  _deviceToken = token
}

// Called when the server rejects this device's token — revoked by a parent, or
// the family was reset. Without this a revoked kiosk would sit there looking
// broken until someone physically reloaded it, which would make "revoke" a
// button with no visible effect. The view drops back to the pairing prompt.
export function onDeviceRevoked(fn) {
  _onDeviceRevoked = fn ?? (() => {})
}

// Returns { ok, status, data }. status is 0 when the request never completed
// (network error), which is distinguishable from a server response.
async function apiRequest(path, options = {}) {
  const token = _getToken ? await _getToken() : null
  // The slug still identifies the family while a device is pairing — it is what
  // POST /auth/device/pair resolves — but once a device token exists it is the
  // credential, and the server ignores the slug entirely.
  const slugHeader = (!token && _familySlug) ? { 'x-family-slug': _familySlug } : {}
  const deviceHeader = (!token && _deviceToken) ? { 'x-device-token': _deviceToken } : {}
  const method = options.method ?? 'GET'
  try {
    const r = await fetch(`${CONFIG.apiUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...slugHeader,
        ...deviceHeader,
        ...options.headers,
      },
    })
    const data = await r.json().catch(() => null) // tolerate empty bodies
    if (!r.ok) console.warn(`API ${method} ${path} → ${r.status}`)
    // Only when this request actually carried the device token — a 401 from any
    // other cause must not throw a paired device back to the pairing prompt.
    if (r.status === 401 && data?.code === 'DEVICE_REVOKED' && deviceHeader['x-device-token']) {
      _deviceToken = null
      _onDeviceRevoked()
    }
    return { ok: r.ok, status: r.status, data }
  } catch (err) {
    console.warn(`API ${method} ${path} failed:`, err)
    return { ok: false, status: 0, data: null }
  }
}

async function apiFetch(path, options = {}) {
  // Non-2xx returns null (not the error body) so a failed request can't
  // masquerade as data — callers already treat null as "no data / failed".
  // Where a caller needs to tell failures apart — a 429 lockout from a wrong
  // PIN, say — use apiPostResult instead.
  const { ok, data } = await apiRequest(path, options)
  return ok ? data : null
}

export function apiGet(path) {
  return apiFetch(path)
}

function parentHeader(parentToken) {
  const token = parentToken ?? _parentToken
  return token ? { 'x-parent-token': token } : {}
}

export function apiPost(path, body, parentToken) {
  return apiFetch(path, {
    method: 'POST',
    body:   JSON.stringify(body),
    headers: parentHeader(parentToken),
  })
}

// Full result rather than null-on-failure, for callers that must distinguish
// *why* a request failed. Used by the PIN modal to tell a rate-limit lockout
// apart from a wrong PIN — they're the same "null" to apiPost.
export function apiPostResult(path, body, parentToken) {
  return apiRequest(path, {
    method: 'POST',
    body:   JSON.stringify(body),
    headers: parentHeader(parentToken),
  })
}

export function apiPut(path, body, parentToken) {
  return apiFetch(path, {
    method: 'PUT',
    body:   JSON.stringify(body),
    headers: parentHeader(parentToken),
  })
}

export function apiDelete(path, body, parentToken) {
  const hasBody = body && typeof body === 'object'
  return apiFetch(path, {
    method: 'DELETE',
    body:    hasBody ? JSON.stringify(body) : undefined,
    headers: parentHeader(parentToken),
  })
}

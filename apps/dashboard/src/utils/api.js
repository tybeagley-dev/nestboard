import { CONFIG } from '../config/config'

let _getToken = null
let _familySlug = null
let _parentToken = null

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

// Returns { ok, status, data }. status is 0 when the request never completed
// (network error), which is distinguishable from a server response.
async function apiRequest(path, options = {}) {
  const token = _getToken ? await _getToken() : null
  const slugHeader = (!token && _familySlug) ? { 'x-family-slug': _familySlug } : {}
  const method = options.method ?? 'GET'
  try {
    const r = await fetch(`${CONFIG.apiUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...slugHeader,
        ...options.headers,
      },
    })
    const data = await r.json().catch(() => null) // tolerate empty bodies
    if (!r.ok) console.warn(`API ${method} ${path} → ${r.status}`)
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

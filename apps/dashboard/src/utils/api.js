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

async function apiFetch(path, options = {}) {
  const token = _getToken ? await _getToken() : null
  const slugHeader = (!token && _familySlug) ? { 'x-family-slug': _familySlug } : {}
  return fetch(`${CONFIG.apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...slugHeader,
      ...options.headers,
    },
  })
    .then(r => r.json())
    .catch(() => null)
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

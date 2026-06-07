import { CONFIG } from '../config/config'

let _getToken = null

export function setTokenGetter(fn) {
  _getToken = fn
}

async function apiFetch(path, options = {}) {
  const token = _getToken ? await _getToken() : null
  return fetch(`${CONFIG.apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
    .then(r => r.json())
    .catch(() => null)
}

export function apiGet(path) {
  return apiFetch(path)
}

export function apiPost(path, body, parentToken) {
  return apiFetch(path, {
    method: 'POST',
    body:   JSON.stringify(body),
    headers: parentToken ? { 'x-parent-token': parentToken } : {},
  })
}

export function apiPut(path, body, parentToken) {
  return apiFetch(path, {
    method: 'PUT',
    body:   JSON.stringify(body),
    headers: parentToken ? { 'x-parent-token': parentToken } : {},
  })
}

export function apiDelete(path, bodyOrToken, parentToken) {
  const hasBody = bodyOrToken && typeof bodyOrToken === 'object'
  return apiFetch(path, {
    method: 'DELETE',
    body:    hasBody ? JSON.stringify(bodyOrToken) : undefined,
    headers: parentToken ? { 'x-parent-token': parentToken } : {},
  })
}

import { useState, useEffect, useCallback } from 'react'
import { getTodayKey } from '../utils/dateUtils'
import { useSseRefetch } from './useLiveSync'

const TOKENS_KEY      = 'fam_dash_tokens'
const CHORE_DONE_KEY = 'fam_dash_chore_done'

function getLocalTokens() {
  return JSON.parse(localStorage.getItem(TOKENS_KEY) ?? '{}')
}

function saveLocalTokens(obj) {
  localStorage.setItem(TOKENS_KEY, JSON.stringify(obj))
  window.dispatchEvent(new Event('fam_tokens_update'))
}

// ── Chore pool ────────────────────────────────────────────────────────────────

export function useChores() {
  const [chores, setChores] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { apiGet } = await import('../utils/api')
      const data = await apiGet('/chores')
      setChores(Array.isArray(data) ? data : [])
    } catch {
      setChores([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { chores, loading, reload: load }
}

// ── Tokens ─────────────────────────────────────────────────────────────

export function useChorePoints(childName) {
  const [tokens, setTokens] = useState(() => getLocalTokens()[childName] ?? 0)

  // Hydrate from API on mount
  useEffect(() => {
    async function load() {
      const { apiGet } = await import('../utils/api')
      const data = await apiGet('/tokens')
      if (!Array.isArray(data)) return
      const row = data.find(d => d.child === childName)
      if (row) {
        setTokens(Number(row.balance))
        const local = getLocalTokens()
        local[childName] = Number(row.balance)
        saveLocalTokens(local)
      }
    }
    load()
  }, [childName])

  // Sync across hook instances when any instance updates tokens
  useEffect(() => {
    function onUpdate() { setTokens(getLocalTokens()[childName] ?? 0) }
    window.addEventListener('fam_tokens_update', onUpdate)
    return () => window.removeEventListener('fam_tokens_update', onUpdate)
  }, [childName])

  const recordCompletion = useCallback(async (_child, _choreId, tokensEarned) => {
    setTokens(b => {
      const next = b + tokensEarned
      const local = getLocalTokens()
      local[childName] = next
      saveLocalTokens(local)
      return next
    })
    return { success: true, tokensEarned }
  }, [childName])

  const adjustTokens = useCallback(async (delta) => {
    setTokens(b => {
      const next = Math.max(0, b + delta)
      const local = getLocalTokens()
      local[childName] = next
      saveLocalTokens(local)
      return next
    })
    const { apiPost } = await import('../utils/api')
    const result = await apiPost(`/tokens/${childName}/adjust`, { delta, type: 'adjustment' })
    if (result?.balance !== undefined) {
      setTokens(Number(result.balance))
      const local = getLocalTokens()
      local[childName] = Number(result.balance)
      saveLocalTokens(local)
    }
  }, [childName])

  const reloadTokens = useCallback(async () => {
    const { apiGet } = await import('../utils/api')
    const data = await apiGet('/tokens')
    if (!Array.isArray(data)) return
    const row = data.find(d => d.child === childName)
    if (row) {
      setTokens(Number(row.balance))
      const local = getLocalTokens()
      local[childName] = Number(row.balance)
      saveLocalTokens(local)
    }
  }, [childName])

  // Instant cross-device token updates (chore approved / screen-time traded elsewhere)
  useSseRefetch('tokens', reloadTokens)

  return { tokens, recordCompletion, adjustTokens, reloadTokens }
}

// ── Chore-as-routine tracking ─────────────────────────────────────────────────

export function markChoreToday(childName) {
  const today = getTodayKey(new Date())
  const raw   = localStorage.getItem(CHORE_DONE_KEY)
  const stored = raw ? JSON.parse(raw) : {}
  const record = stored.date === today ? stored : { date: today, children: {} }
  record.children[childName] = true
  localStorage.setItem(CHORE_DONE_KEY, JSON.stringify(record))
  window.dispatchEvent(new CustomEvent('fam_chore_done_update'))
}

export function useChoreCompletedToday(childName) {
  function read() {
    const today = getTodayKey(new Date())
    const raw   = localStorage.getItem(CHORE_DONE_KEY)
    if (!raw) return false
    const stored = JSON.parse(raw)
    return stored.date === today && !!stored.children?.[childName]
  }

  const [done, setDone] = useState(read)

  useEffect(() => {
    function onUpdate() { setDone(read()) }
    window.addEventListener('fam_chore_done_update', onUpdate)
    return () => window.removeEventListener('fam_chore_done_update', onUpdate)
  }, [childName])

  return done
}

// ── Chore admin (parent panel) ────────────────────────────────────────────

export async function adminAddChore(data) {
  const { apiPost } = await import('../utils/api')
  return apiPost('/chores', {
    id:           data.id || Date.now().toString(36),
    label:        data.label,
    tokens:        data.tokens,
    icon:         data.icon,
    active:       data.active !== false,
    required:     data.required ?? false,
    days:         data.days ?? [],
    instructions: data.instructions?.filter(Boolean) ?? [],
    max_per_week: data.frequency === 'weekly' ? 1 : null,
  })
}

export async function adminGetAllChores() {
  const { apiGet } = await import('../utils/api')
  const data = await apiGet('/chores?includeInactive=true')
  return Array.isArray(data) ? data : []
}

export async function adminEditChore(data) {
  const { apiPut } = await import('../utils/api')
  return apiPut(`/chores/${data.id}`, {
    label:        data.label,
    tokens:        data.tokens,
    icon:         data.icon,
    active:       data.active !== false,
    required:     data.required ?? false,
    days:         data.days ?? [],
    instructions: data.instructions?.filter(Boolean) ?? [],
    max_per_week: data.frequency === 'weekly' ? 1 : null,
  })
}

export async function adminDeleteChore(id) {
  const { apiDelete } = await import('../utils/api')
  return apiDelete(`/chores/${id}`)
}

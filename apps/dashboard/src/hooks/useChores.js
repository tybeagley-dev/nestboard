import { useState, useEffect, useCallback } from 'react'
import { CONFIG } from '../config/config'
import { getTodayKey } from '../utils/dateUtils'

const BUCKS_KEY      = 'fam_dash_bucks'
const CHORE_DONE_KEY = 'fam_dash_chore_done'

function getLocalBucks() {
  return JSON.parse(localStorage.getItem(BUCKS_KEY) ?? '{}')
}

function saveLocalBucks(obj) {
  localStorage.setItem(BUCKS_KEY, JSON.stringify(obj))
  window.dispatchEvent(new Event('fam_bucks_update'))
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
      setChores(Array.isArray(data) && data.length > 0 ? data : CONFIG.demoChores)
    } catch {
      setChores(CONFIG.demoChores)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { chores, loading, reload: load }
}

// ── Beagley Bucks ─────────────────────────────────────────────────────────────

export function useChorePoints(childName) {
  const [bucks, setBucks] = useState(() => getLocalBucks()[childName] ?? 0)

  // Hydrate from API on mount
  useEffect(() => {
    async function load() {
      const { apiGet } = await import('../utils/api')
      const data = await apiGet('/bucks')
      if (!Array.isArray(data)) return
      const row = data.find(d => d.child === childName)
      if (row) {
        setBucks(Number(row.balance))
        const local = getLocalBucks()
        local[childName] = Number(row.balance)
        saveLocalBucks(local)
      }
    }
    load()
  }, [childName])

  // Sync across hook instances when any instance updates bucks
  useEffect(() => {
    function onUpdate() { setBucks(getLocalBucks()[childName] ?? 0) }
    window.addEventListener('fam_bucks_update', onUpdate)
    return () => window.removeEventListener('fam_bucks_update', onUpdate)
  }, [childName])

  const recordCompletion = useCallback(async (_child, _choreId, bucksEarned) => {
    setBucks(b => {
      const next = b + bucksEarned
      const local = getLocalBucks()
      local[childName] = next
      saveLocalBucks(local)
      return next
    })
    return { success: true, bucksEarned }
  }, [childName])

  const adjustBucks = useCallback(async (delta) => {
    setBucks(b => {
      const next = Math.max(0, b + delta)
      const local = getLocalBucks()
      local[childName] = next
      saveLocalBucks(local)
      return next
    })
    const { apiPost } = await import('../utils/api')
    const result = await apiPost(`/bucks/${childName}/adjust`, { delta, type: 'adjustment' }, CONFIG.parentPin)
    if (result?.balance !== undefined) {
      setBucks(Number(result.balance))
      const local = getLocalBucks()
      local[childName] = Number(result.balance)
      saveLocalBucks(local)
    }
  }, [childName])

  const reloadBucks = useCallback(async () => {
    const { apiGet } = await import('../utils/api')
    const data = await apiGet('/bucks')
    if (!Array.isArray(data)) return
    const row = data.find(d => d.child === childName)
    if (row) {
      setBucks(Number(row.balance))
      const local = getLocalBucks()
      local[childName] = Number(row.balance)
      saveLocalBucks(local)
    }
  }, [childName])

  return { bucks, recordCompletion, adjustBucks, reloadBucks }
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
    bucks:        data.bucks,
    icon:         data.icon,
    active:       data.active !== false,
    required:     data.required ?? false,
    days:         data.days ?? [],
    instructions: data.instructions?.filter(Boolean) ?? [],
    max_per_week: data.frequency === 'weekly' ? 1 : null,
  }, CONFIG.parentPin)
}

export async function adminGetAllChores() {
  const { apiGet } = await import('../utils/api')
  const data = await apiGet('/chores?includeInactive=true')
  return Array.isArray(data) && data.length > 0 ? data : CONFIG.demoChores
}

export async function adminEditChore(data) {
  const { apiPut } = await import('../utils/api')
  return apiPut(`/chores/${data.id}`, {
    label:        data.label,
    bucks:        data.bucks,
    icon:         data.icon,
    active:       data.active !== false,
    required:     data.required ?? false,
    days:         data.days ?? [],
    instructions: data.instructions?.filter(Boolean) ?? [],
    max_per_week: data.frequency === 'weekly' ? 1 : null,
  }, CONFIG.parentPin)
}

export async function adminDeleteChore(id) {
  const { apiDelete } = await import('../utils/api')
  return apiDelete(`/chores/${id}`, CONFIG.parentPin)
}

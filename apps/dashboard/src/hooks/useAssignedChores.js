import { useState, useEffect } from 'react'
import { getTodayKey } from '../utils/dateUtils'
import { CONFIG } from '../config/config'
import { hydrateWeeklyFromHistory, isChoreAvailableThisWeek } from './useChoreFrequency'
import { apiGet, apiPost } from '../utils/api'

const ASSIGNED_KEY  = 'fam_dash_assigned_chores'
const EVENT         = 'fam_assigned_update'
const REFETCH_EVENT = 'fam_refetch_chores'
const POLL_MS       = 20 * 1000

function getToday() { return getTodayKey(new Date()) }

const DAY_INDEX = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 }

function choreStartedThisWeek(days) {
  const todayIdx = new Date().getDay()
  return days.some(d => {
    const dayIdx = DAY_INDEX[d] ?? 7
    // Sunday is day 0 — always <= any weekday, so it would appear all week without this guard
    return dayIdx === 0 ? todayIdx === 0 : dayIdx <= todayIdx
  })
}

function loadAssignments() {
  const raw = localStorage.getItem(ASSIGNED_KEY)
  if (!raw) return {}
  const stored = JSON.parse(raw)
  return stored.date === getToday() ? (stored.assignments ?? {}) : {}
}

function saveAssignments(assignments) {
  localStorage.setItem(ASSIGNED_KEY, JSON.stringify({ date: getToday(), assignments }))
  window.dispatchEvent(new CustomEvent(EVENT))
}

function buildFromApi(childName, todayEntries, weekCompleted, chores) {
  const weekDone    = new Set(weekCompleted[childName] ?? [])
  const todayLocal  = getTodayKey(new Date())

  const required = chores
    .filter(c =>
      c.required &&
      c.active !== false &&
      (c.days.length === 0 || choreStartedThisWeek(c.days)) &&
      !weekDone.has(c.id)
    )
    .map(c => ({
      ...c,
      completed: todayEntries[c.id]?.status === 'completed' || false,
      pending:   todayEntries[c.id]?.status === 'pending_approval' || false,
    }))

  const spin = Object.entries(todayEntries)
    .map(([choreId, entry]) => {
      const def = chores.find(c => c.id === choreId) ?? {}
      return {
        id:           choreId,
        label:        entry.choreLabel,
        tokens:        entry.tokens,
        icon:         def.icon ?? '',
        required:     def.required ?? false,
        instructions: def.instructions ?? [],
        completed:    entry.status === 'completed',
        pending:      entry.status === 'pending_approval',
        acceptedAt:   entry.acceptedAt ?? null,
      }
    })
    .filter(c => {
      if (c.required) return false
      // Exclude spin chores accepted on a previous local day — UTC timestamps can
      // shift a late-evening acceptance into the next UTC date, causing yesterday's
      // pending chores to appear on today's card.
      if (!c.acceptedAt) return true
      return getTodayKey(new Date(c.acceptedAt)) >= todayLocal
    })

  return [...required, ...spin]
}

export function getClaimedChoreIds(childName) {
  const all = loadAssignments()
  const ids = new Set()
  Object.entries(all).forEach(([name, chores]) => {
    chores.filter(c => !c.required).forEach(c => {
      if (name !== childName || c.completed) ids.add(c.id)
    })
  })
  return ids
}

export function unassignChore(childName, choreId) {
  const all = loadAssignments()
  if (!all[childName]) return
  all[childName] = all[childName].filter(c => c.id !== choreId)
  saveAssignments(all)
}

export function assignChores(childName, newChores) {
  const all         = loadAssignments()
  const existing    = all[childName] ?? []
  const existingIds = new Set(existing.map(c => c.id))
  const toAdd       = newChores.filter(c => !existingIds.has(c.id))
  if (!toAdd.length) return
  const now = new Date().toISOString()
  all[childName] = [...existing, ...toAdd.map(c => ({ ...c, acceptedAt: c.acceptedAt ?? now }))]
  saveAssignments(all)
}

export function markChoreAsPending(childName, choreId) {
  const all = loadAssignments()
  if (!all[childName]) return
  all[childName] = all[childName].map(c =>
    c.id === choreId ? { ...c, pending: true } : c
  )
  saveAssignments(all)
}

export function completeAssignedChore(childName, choreId) {
  const all = loadAssignments()
  if (!all[childName]) return
  all[childName] = all[childName].map(c =>
    c.id === choreId ? { ...c, completed: true } : c
  )
  saveAssignments(all)
}

export function acceptChoresToApi(child, chores) {
  return Promise.all(chores.map(c =>
    apiPost(`/chores/${c.id}/accept`, {
      child:      child.name,
      choreLabel: c.label,
      tokens:      c.tokens,
    })
  ))
}

export function submitApprovalRequest(child, choreId, choreLabel, tokens) {
  return apiPost(`/chores/${choreId}/request-approval`, {
    child:      child.name,
    choreLabel,
    tokens,
  })
}

export function triggerChoreRefetch() {
  window.dispatchEvent(new Event(REFETCH_EVENT))
}

export function useAssignedChores(childName, chores = []) {
  const [assignedChores, setAssignedChores] = useState([])
  const [loading, setLoading]               = useState(true)

  // Reflect optimistic local updates instantly
  useEffect(() => {
    function onUpdate() { setAssignedChores(loadAssignments()[childName] ?? []) }
    window.addEventListener(EVENT, onUpdate)
    return () => window.removeEventListener(EVENT, onUpdate)
  }, [childName])

  // API is source of truth — fetch on mount, poll every 20s, and on demand
  useEffect(() => {
    // No chores to assign — resolve loading so the card shows its empty state
    // instead of spinning forever (e.g. a brand-new family with no chores yet).
    if (!chores.length) { setLoading(false); return }

    async function hydrate() {
      const data = await apiGet(`/chores/state?date=${getToday()}`)
      if (!data) { setLoading(false); return }
      hydrateWeeklyFromHistory(data.weekCompleted ?? {}, chores)
      const built = buildFromApi(childName, data.today?.[childName] ?? {}, data.weekCompleted ?? {}, chores)
      const all = loadAssignments()
      const localChores  = all[childName] ?? []
      const localPending = new Set(localChores.filter(c => c.pending && !c.completed).map(c => c.id))
      const localMap     = Object.fromEntries(localChores.map(c => [c.id, c]))
      const builtIds     = new Set(built.map(c => c.id))
      const now          = Date.now()
      // Preserve locally-assigned chores not yet confirmed by the API, but only within a 5-minute window
      const apiChildToday = data.today?.[childName] ?? {}
      const inFlight     = localChores.filter(c =>
        !c.required &&
        !builtIds.has(c.id) &&
        c.acceptedAt &&
        (now - new Date(c.acceptedAt).getTime()) < 5 * 60 * 1000 &&
        // If the API has no record and we had it as pending, it was rejected — don't re-add it
        !(localPending.has(c.id) && !apiChildToday[c.id])
      )
      all[childName] = [
        ...built.map(c => ({
          ...c,
          // Only trust local pending if the API also has a record — if the API deleted it (rejection), clear it
          pending:    c.pending || (localPending.has(c.id) && !c.completed && !!data.today?.[childName]?.[c.id]),
          acceptedAt: c.acceptedAt ?? localMap[c.id]?.acceptedAt ?? null,
        })),
        ...inFlight,
      ]
      saveAssignments(all)
      setLoading(false)
    }

    hydrate()
    const poll    = setInterval(hydrate, POLL_MS)
    const onForce = () => hydrate()
    window.addEventListener(REFETCH_EVENT, onForce)

    return () => {
      clearInterval(poll)
      window.removeEventListener(REFETCH_EVENT, onForce)
    }
  }, [childName, chores.length]) // eslint-disable-line react-hooks/exhaustive-deps

  return { chores: assignedChores, loading }
}

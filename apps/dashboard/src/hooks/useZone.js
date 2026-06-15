import { useState, useEffect, useCallback } from 'react'
import { getTodayKey } from '../utils/dateUtils'
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api'

const POLL_MS = 30 * 1000

// Morning unlocks at 6am, noon at 11am, evening at 4pm
const PERIOD_UNLOCK_HOURS = { morning: 6, noon: 11, evening: 16 }
export const PERIODS = ['morning', 'noon', 'evening']

export function isPeriodUnlocked(period, now) {
  return now.getHours() >= PERIOD_UNLOCK_HOURS[period]
}

export function useZone(child, now) {
  const [assignments, setAssignments] = useState([])
  const [checks,      setChecks]      = useState({})
  const [loading,     setLoading]     = useState(true)

  const todayKey = getTodayKey(now)

  const loadAssignments = useCallback(async () => {
    const data = await apiGet(`/zones/assignments?date=${todayKey}`)
    if (!data?.assignments) return
    const mine = data.assignments.filter(a => a.child_id === child.id)
    setAssignments(mine)
  }, [todayKey, child.id])

  const loadChecks = useCallback(async () => {
    const data = await apiGet(`/zones/checks?date=${todayKey}&child_id=${child.id}`)
    if (data?.checks) setChecks(data.checks)
  }, [todayKey, child.id])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadAssignments(), loadChecks()]).then(() => setLoading(false))
    const id = setInterval(() => { loadAssignments(); loadChecks() }, POLL_MS)
    return () => clearInterval(id)
  }, [loadAssignments, loadChecks])

  const toggleCheck = useCallback(async (assignmentId, period) => {
    const key = `${assignmentId}__${period}`
    setChecks(prev => ({ ...prev, [key]: !prev[key] }))

    const data = await apiPost('/zones/checks/toggle', {
      date: todayKey,
      child_id: child.id,
      assignment_id: assignmentId,
      period,
    })
    if (data?.checks) setChecks(data.checks)
    else setChecks(prev => ({ ...prev, [key]: !prev[key] }))
  }, [todayKey, child.id])

  const isChecked = (assignmentId, period) => !!checks[`${assignmentId}__${period}`]

  return { assignments, checks, loading, toggleCheck, isChecked }
}

// ── Parent admin ──────────────────────────────────────────────────────────────

export function useZoneDefs() {
  const [defs,    setDefs]    = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await apiGet('/zones/defs')
    setDefs(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return { defs, loading, reload: load }
}

export async function adminAddZone(data) {
  return apiPost('/zones/defs', {
    label:              data.label,
    icon:               data.icon,
    eligible_child_ids: data.eligible_child_ids ?? [],
    sort_order:         data.sort_order ?? 0,
  })
}

export async function adminEditZone(id, data) {
  return apiPut(`/zones/defs/${id}`, {
    label:              data.label,
    icon:               data.icon,
    eligible_child_ids: data.eligible_child_ids ?? [],
    sort_order:         data.sort_order ?? 0,
  })
}

export async function adminDeleteZone(id) {
  return apiDelete(`/zones/defs/${id}`)
}

export async function adminAddMicroZone(zoneId, data) {
  return apiPost('/zones/micro-zones', {
    zone_id:    zoneId,
    label:      data.label,
    active:     data.active ?? true,
    sort_order: data.sort_order ?? 0,
  })
}

export async function adminEditMicroZone(id, data) {
  return apiPut(`/zones/micro-zones/${id}`, {
    label:      data.label,
    active:     data.active ?? true,
    sort_order: data.sort_order ?? 0,
  })
}

export async function adminDeleteMicroZone(id) {
  return apiDelete(`/zones/micro-zones/${id}`)
}

export async function adminUpdateAssignment(id, microZoneId) {
  return apiPut(`/zones/assignments/${id}`, { micro_zone_id: microZoneId })
}

export async function adminAddManualAssignment(data) {
  return apiPost('/zones/assignments', data)
}

export async function adminDeleteAssignment(id) {
  return apiDelete(`/zones/assignments/${id}`)
}

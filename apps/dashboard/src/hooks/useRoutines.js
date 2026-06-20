import { useState, useEffect, useCallback } from 'react'
import { getTodayKey } from '../utils/dateUtils'
import { getCurrentScheduleMode } from '../utils/scheduleUtils'
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api'
import { useSseRefetch } from './useLiveSync'

const POLL_MS = 20 * 1000

export function useScheduleConfig() {
  const [scheduleConfig, setScheduleConfig] = useState({})

  const load = useCallback(async () => {
    const data = await apiGet('/schedule/config')
    if (data) setScheduleConfig(data)
  }, [])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (config) => {
    const data = await apiPut('/schedule/config', config)
    if (data) setScheduleConfig(data)
  }, [])

  return { scheduleConfig, reload: load, save }
}

export function useRoutines(now, children = [], scheduleConfig = {}) {
  const [completed,   setCompleted]   = useState({})
  const [routineDefs, setRoutineDefs] = useState([])
  const [loading,     setLoading]     = useState(true)
  const todayKey = getTodayKey(now)

  // Completion state from API — SSE for instant cross-device sync, poll as fallback
  const hydrate = useCallback(async () => {
    const data = await apiGet(`/routines?date=${todayKey}`)
    if (data?.completed) setCompleted(data.completed)
    setLoading(false)
  }, [todayKey])

  useEffect(() => {
    setLoading(true)
    hydrate()
    const id = setInterval(hydrate, POLL_MS)
    return () => clearInterval(id)
  }, [hydrate])

  useSseRefetch('routine_state', hydrate)

  // Routine definitions — prefer DB, fall back to config.js
  useEffect(() => {
    apiGet('/routines/defs').then(data => {
      if (Array.isArray(data) && data.length > 0) setRoutineDefs(data)
    })
  }, [])

  const toggleRoutine = useCallback((childName, routineId) => {
    const key = `${childName}__${routineId}`

    // Optimistic update
    setCompleted(prev => ({ ...prev, [key]: !prev[key] }))

    // Write to API — response contains confirmed state, apply it
    apiPost('/routines/toggle', { date: todayKey, child: childName, routineId })
      .then(data => { if (data?.completed) setCompleted(data.completed) })
      .catch(() => {
        // Revert optimistic update on failure
        setCompleted(prev => ({ ...prev, [key]: !prev[key] }))
      })
  }, [todayKey])

  const mode = getCurrentScheduleMode(now, scheduleConfig)

  const routinesByChild = {}
  children.forEach(child => {
    const childDefs = routineDefs.filter(r => r.child === child.name)
    routinesByChild[child.name] = childDefs
      .filter(r => {
        if (!r.schedules.includes(mode)) return false
        if (!r.time) return true
        const isEvening = now.getHours() >= 12
        return r.time === (isEvening ? 'evening' : 'morning')
      })
      .map(r => ({ ...r, completed: !!completed[`${child.name}__${r.id}`] }))
  })

  return { routinesByChild, toggleRoutine, mode, loading }
}

// ── Parent panel admin ────────────────────────────────────────────────────────

export function useRoutineDefs() {
  const [defs,    setDefs]    = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await apiGet('/routines/defs')
    setDefs(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return { defs, loading, reload: load }
}

export async function adminAddRoutineDef(data) {
  return apiPost('/routines/defs', {
    id:        data.id,
    child:     data.child,
    label:     data.label,
    icon:      data.icon,
    schedules: data.schedules,
    time:      data.time || null,
    sort_order: data.sortOrder ?? 0,
  })
}

export async function adminEditRoutineDef(data) {
  return apiPut(`/routines/defs/${data.id}`, {
    child:     data.child,
    label:     data.label,
    icon:      data.icon,
    schedules: data.schedules,
    time:      data.time || null,
    sort_order: data.sortOrder ?? 0,
  })
}

export async function adminDeleteRoutineDef(id) {
  return apiDelete(`/routines/defs/${id}`)
}

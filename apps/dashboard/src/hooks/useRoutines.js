import { useState, useEffect, useCallback } from 'react'
import { CONFIG } from '../config/config'
import { getTodayKey } from '../utils/dateUtils'
import { getCurrentScheduleMode } from '../utils/scheduleUtils'
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api'

const POLL_MS = 20 * 1000

function configDefs() {
  return []
}

export function useRoutines(now, children = []) {
  const [completed,   setCompleted]   = useState({})
  const [routineDefs, setRoutineDefs] = useState(configDefs)
  const [loading,     setLoading]     = useState(true)
  const todayKey = getTodayKey(now)

  // Completion state from API — poll every 20s for cross-device sync
  useEffect(() => {
    async function hydrate() {
      const data = await apiGet(`/routines?date=${todayKey}`)
      if (data?.completed) setCompleted(data.completed)
      setLoading(false)
    }
    setLoading(true)
    hydrate()
    const id = setInterval(hydrate, POLL_MS)
    return () => clearInterval(id)
  }, [todayKey])

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

  const mode = getCurrentScheduleMode(now, CONFIG)

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

import { useState, useEffect, useCallback } from 'react'
import { CONFIG } from '../config/config'
import { apiGet, apiPost } from '../utils/api'

const POLL_MS = 20 * 1000

function dispatchBalanceUpdate() { window.dispatchEvent(new Event('fam_balance_update')) }
function dispatchTimerUpdate()   { window.dispatchEvent(new Event('fam_timer_update'))   }

// ── Balance ───────────────────────────────────────────────────────────────────

export function useScreenBalance(childName) {
  const [balance,           setBalance]           = useState(0)
  const [purchasedBalance,  setPurchasedBalance]  = useState(0)
  const [dailyFreeAvailable, setDailyFreeAvailable] = useState(0)

  const sync = useCallback(async () => {
    const data = await apiGet('/screen-time')
    if (!Array.isArray(data)) return
    const row = data.find(d => d.child === childName)
    if (!row) return
    setBalance(Number(row.balance ?? 0))
    setPurchasedBalance(Number(row.purchased_balance ?? 0))
    setDailyFreeAvailable(Number(row.daily_free_available ?? 0))
  }, [childName])

  useEffect(() => {
    sync()
    const id = setInterval(sync, POLL_MS)
    return () => clearInterval(id)
  }, [sync])

  useEffect(() => {
    window.addEventListener('fam_balance_update', sync)
    return () => window.removeEventListener('fam_balance_update', sync)
  }, [sync])

  const addMinutes = useCallback((minutes) => {
    setBalance(prev => Math.max(0, prev + minutes))
    apiPost(`/screen-time/${childName}/adjust`, { delta: minutes })
      .then(data => { if (data?.balance != null) setBalance(Number(data.balance)) })
    dispatchBalanceUpdate()
  }, [childName])

  return { balance, purchasedBalance, dailyFreeAvailable, addMinutes }
}

// ── Timer ─────────────────────────────────────────────────────────────────────

export async function startChildTimer(childName) {
  const durationMinutes = CONFIG.screenTime?.minutesPerChore ?? 30
  const bufferMinutes   = (CONFIG.screenTime?.timerBufferMinutes ?? 35) - durationMinutes

  await apiPost(`/timers/${childName}/start`, { durationMinutes, bufferMinutes })
  dispatchBalanceUpdate()
  dispatchTimerUpdate()
}

export async function stopChildTimer(childName, { expired = false } = {}) {
  await apiPost(`/timers/${childName}/stop`, { expired })
  dispatchBalanceUpdate()
  dispatchTimerUpdate()
}

// ── Active timers (reactive) ──────────────────────────────────────────────────

export function useActiveChildTimers() {
  const [timerMap, setTimerMap] = useState({})
  const [now, setNow]           = useState(Date.now)

  async function loadTimers() {
    const data = await apiGet('/timers')
    if (!Array.isArray(data)) return
    const map = {}
    data.forEach(t => { map[t.child] = t })
    setTimerMap(map)
  }

  useEffect(() => {
    loadTimers()
    window.addEventListener('fam_timer_update', loadTimers)
    return () => window.removeEventListener('fam_timer_update', loadTimers)
  }, [])

  // Tick every second while any timer is active
  useEffect(() => {
    if (Object.keys(timerMap).length === 0) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [timerMap])

  // Clean up expired timers
  useEffect(() => {
    Object.values(timerMap).forEach(timer => {
      if (now - Number(timer.end_time) > 5000) stopChildTimer(timer.child, { expired: true })
    })
  }, [timerMap, now])

  return Object.values(timerMap).map(timer => {
    const msLeft   = Number(timer.end_time) - now
    const totalSec = Math.max(0, Math.ceil(msLeft / 1000))
    return {
      child:   timer.child,
      minutes: Math.floor(totalSec / 60),
      seconds: totalSec % 60,
      expired: msLeft <= 0,
      endTime: Number(timer.end_time),
    }
  })
}

import { useState, useEffect, useCallback } from 'react'

const TIDY_KEY = 'fam_dash_tidy_timer'

function loadTidy() {
  try { return JSON.parse(localStorage.getItem(TIDY_KEY) ?? 'null') } catch { return null }
}

export function useTidyTimer() {
  const [timer, setTimer] = useState(loadTidy)
  const [now, setNow] = useState(Date.now)

  // Cross-component sync within same tab
  useEffect(() => {
    const sync = () => setTimer(loadTidy())
    window.addEventListener('fam_tidy_update', sync)
    return () => window.removeEventListener('fam_tidy_update', sync)
  }, [])

  // Tick while active
  useEffect(() => {
    if (!timer) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [timer])

  const startTimer = useCallback((minutes) => {
    const endTime = Date.now() + minutes * 60 * 1000
    const data = { endTime }
    localStorage.setItem(TIDY_KEY, JSON.stringify(data))
    window.dispatchEvent(new Event('fam_tidy_update'))
    setTimer(data)
  }, [])

  const stopTimer = useCallback(() => {
    localStorage.removeItem(TIDY_KEY)
    window.dispatchEvent(new Event('fam_tidy_update'))
    setTimer(null)
  }, [])

  if (!timer) return { active: false, startTimer, stopTimer, minutes: 0, seconds: 0, expired: false }

  const msLeft = timer.endTime - now
  if (msLeft <= -5000) {
    stopTimer()
    return { active: false, startTimer, stopTimer, minutes: 0, seconds: 0, expired: false }
  }

  const totalSec = Math.max(0, Math.ceil(msLeft / 1000))
  return {
    active:    true,
    minutes:   Math.floor(totalSec / 60),
    seconds:   totalSec % 60,
    expired:   msLeft <= 0,
    startTimer,
    stopTimer,
  }
}

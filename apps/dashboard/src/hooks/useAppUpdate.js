import { useEffect, useRef, useState } from 'react'

// Long-lived surfaces never reload themselves, so they can run a build for weeks.
// A page load always gets the newest bundle — index.html carries an ETag and no
// Cache-Control, so browsers must revalidate, and Vite's asset names are content
// hashed. Nothing was *causing* a page load.
//
// Two triggers, aimed at the two ways this actually goes stale:
//   - Coming back to a backgrounded PWA. iOS resumes the existing page rather
//     than navigating, so returning to the app is the moment to check — and it's
//     safe, because nothing has been typed yet.
//   - A fridge tablet nobody ever backgrounds. Handled by the nightly backstop.
//
// Deliberately not a service-worker update flow: sw.js caches nothing today, and
// adding precaching to get update notifications would introduce the stale-cache
// problem this app currently doesn't have.

const CHECK_THROTTLE_MS = 5 * 60 * 1000
const IDLE_BEFORE_RELOAD_MS = 2 * 60 * 1000
const MIN_UPTIME_BEFORE_RELOAD_MS = 10 * 60 * 1000
const NIGHTLY_HOUR = 4

// The deployed index.html's ETag stands in for a build id — no build-time stamping
// or /version endpoint to keep in sync. A JS fetch isn't navigation-mode, so the
// service worker's shell rewrite doesn't touch it.
async function currentBuildTag() {
  try {
    const res = await fetch('/', { method: 'HEAD', cache: 'no-store' })
    if (!res.ok) return null
    return res.headers.get('etag') ?? res.headers.get('last-modified')
  } catch {
    return null
  }
}

export function useAppUpdate({ kiosk = false } = {}) {
  const baseline        = useRef(null)
  const lastCheck       = useRef(0)
  const lastInteraction = useRef(Date.now())
  const mountedAt       = useRef(Date.now())
  const [updateReady, setUpdateReady] = useState(false)

  useEffect(() => {
    let alive = true
    currentBuildTag().then(tag => { if (alive) baseline.current = tag })
    return () => { alive = false }
  }, [])

  // A kiosk reload mid-tap would eat a child's chore submission, so reloads wait
  // for a quiet moment rather than firing the instant an update is spotted.
  useEffect(() => {
    const bump = () => { lastInteraction.current = Date.now() }
    window.addEventListener('pointerdown', bump)
    window.addEventListener('keydown', bump)
    return () => {
      window.removeEventListener('pointerdown', bump)
      window.removeEventListener('keydown', bump)
    }
  }, [])

  useEffect(() => {
    async function check() {
      if (!baseline.current || updateReady) return
      if (Date.now() - lastCheck.current < CHECK_THROTTLE_MS) return
      lastCheck.current = Date.now()
      const tag = await currentBuildTag()
      if (tag && tag !== baseline.current) setUpdateReady(true)
    }
    function onVisibility() {
      if (document.visibilityState === 'visible') check()
    }
    document.addEventListener('visibilitychange', onVisibility)
    const id = setInterval(check, CHECK_THROTTLE_MS)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      clearInterval(id)
    }
  }, [updateReady])

  // Shared display: no one is going to tap a banner, and there's no unsaved state
  // worth preserving (timers live server-side), so it reloads itself once idle.
  useEffect(() => {
    if (!kiosk || !updateReady) return
    const id = setInterval(() => {
      if (Date.now() - lastInteraction.current > IDLE_BEFORE_RELOAD_MS) window.location.reload()
    }, 15000)
    return () => clearInterval(id)
  }, [kiosk, updateReady])

  // Backstop for a display that somehow never notices an update. The uptime guard
  // keeps a 4am reload from immediately re-qualifying and looping.
  useEffect(() => {
    if (!kiosk) return
    const id = setInterval(() => {
      const now = new Date()
      if (now.getHours() !== NIGHTLY_HOUR || now.getMinutes() >= 5) return
      if (Date.now() - mountedAt.current < MIN_UPTIME_BEFORE_RELOAD_MS) return
      if (Date.now() - lastInteraction.current < IDLE_BEFORE_RELOAD_MS) return
      window.location.reload()
    }, 4 * 60 * 1000)
    return () => clearInterval(id)
  }, [kiosk])

  return updateReady
}

import { useEffect, useRef } from 'react'
import { CONFIG } from '../config/config'
import { apiPost } from '../utils/api'

// Server event types pushed over SSE (see api/src/routes — broadcast() calls).
const SSE_TYPES = [
  'grocery', 'announcements', 'routine_state', 'tokens',
  'screen_time', 'screen_time_requests', 'chore_state', 'timers', 'meals',
  // The families row itself — name/greeting/labels/settings/weather. Unlike the
  // rest, this one is read once at mount, so without it a shared display shows
  // stale labels and feature flags until someone reloads it.
  'family',
]

const RECONNECT_MS = 5000

// Opens an SSE connection scoped to the family and rebroadcasts each server event
// as a `sse:<type>` window event. The existing polls stay as a fallback for when
// the connection drops.
//
// Auth is a single-use ticket minted over a normal authenticated request, because
// EventSource can't send headers and the family slug is a permanent credential —
// it has no business in a URL that proxies and access logs record. Native
// EventSource reconnection would replay the consumed ticket, so reconnection is
// driven here instead: on error, close and mint a fresh one.
export function useLiveSync(slug) {
  useEffect(() => {
    if (!slug) return
    let es = null
    let retry = null
    let cancelled = false

    const attach = source => SSE_TYPES.map(type => {
      const handler = e => {
        let data = {}
        try { data = JSON.parse(e.data) } catch {}
        window.dispatchEvent(new CustomEvent(`sse:${type}`, { detail: data }))
      }
      source.addEventListener(type, handler)
      return [type, handler]
    })

    async function connect() {
      if (cancelled) return
      const res = await apiPost('/events/ticket', {})
      if (cancelled) return
      if (!res?.ticket) {
        retry = setTimeout(connect, RECONNECT_MS)
        return
      }
      es = new EventSource(`${CONFIG.apiUrl}/events?ticket=${encodeURIComponent(res.ticket)}`)
      attach(es)
      es.onerror = () => {
        es?.close()
        es = null
        if (!cancelled) retry = setTimeout(connect, RECONNECT_MS)
      }
    }

    connect()

    return () => {
      cancelled = true
      clearTimeout(retry)
      es?.close()
    }
  }, [slug])
}

// Runs `fn` whenever a `sse:<type>` window event fires. Uses a ref so an
// unmemoized fn doesn't churn the subscription.
export function useSseRefetch(type, fn) {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    const handler = () => ref.current()
    window.addEventListener(`sse:${type}`, handler)
    return () => window.removeEventListener(`sse:${type}`, handler)
  }, [type])
}

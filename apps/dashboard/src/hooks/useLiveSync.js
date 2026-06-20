import { useEffect, useRef } from 'react'
import { CONFIG } from '../config/config'

// Server event types pushed over SSE (see api/src/routes — broadcast() calls).
const SSE_TYPES = [
  'grocery', 'announcements', 'routine_state', 'tokens',
  'screen_time', 'screen_time_requests', 'chore_state', 'timers', 'meals',
]

// Opens an SSE connection scoped to the family (identified by slug, since
// EventSource can't send auth headers) and rebroadcasts each server event as a
// `sse:<type>` window event. Native EventSource handles reconnection. The
// existing polls stay as a fallback for when the connection drops.
export function useLiveSync(slug) {
  useEffect(() => {
    if (!slug) return
    const es = new EventSource(`${CONFIG.apiUrl}/events?slug=${encodeURIComponent(slug)}`)

    const handlers = SSE_TYPES.map(type => {
      const handler = e => {
        let data = {}
        try { data = JSON.parse(e.data) } catch {}
        window.dispatchEvent(new CustomEvent(`sse:${type}`, { detail: data }))
      }
      es.addEventListener(type, handler)
      return [type, handler]
    })

    return () => {
      handlers.forEach(([type, handler]) => es.removeEventListener(type, handler))
      es.close()
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

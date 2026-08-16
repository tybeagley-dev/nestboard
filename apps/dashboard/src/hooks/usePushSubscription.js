import { useState, useEffect } from 'react'
import { apiPost, apiDelete } from '../utils/api'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

// Parent subscriptions only — see api/src/utils/push.js and migration 032 for why
// there is no longer a child-scoped audience. `subscribed` reflects the browser's
// single push subscription, so one device holds one subscription, full stop.
export function usePushSubscription() {
  const [supported,  setSupported]  = useState(false)
  const [permission, setPermission] = useState('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading,    setLoading]    = useState(false)

  useEffect(() => {
    const ok = 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY
    setSupported(ok)
    if (!ok) return
    setPermission(Notification.permission)
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => setSubscribed(!!sub))
    })
  }, [])

  async function subscribe() {
    if (!supported || loading) return
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
      const json = sub.toJSON()
      await apiPost('/push/subscribe', {
        endpoint: json.endpoint,
        keys: json.keys,
      })
      setPermission(Notification.permission)
      setSubscribed(true)
    } catch (err) {
      console.error('Push subscribe failed:', err)
    } finally {
      setLoading(false)
    }
  }

  async function unsubscribe() {
    if (!supported || loading) return
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await apiDelete('/push/subscribe', sub.endpoint)
        await sub.unsubscribe()
      }
      setSubscribed(false)
    } catch (err) {
      console.error('Push unsubscribe failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return { supported, permission, subscribed, loading, subscribe, unsubscribe }
}

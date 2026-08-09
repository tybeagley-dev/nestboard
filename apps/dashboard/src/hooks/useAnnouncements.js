import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost, apiDelete } from '../utils/api'
import { useSseRefetch } from './useLiveSync'

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState([])

  const load = useCallback(() => {
    apiGet('/announcements').then(data => {
      if (Array.isArray(data)) setAnnouncements(data)
    })
  }, [])

  useEffect(() => { load() }, [load])
  useSseRefetch('announcements', load)

  const addAnnouncement = useCallback(async (text) => {
    // Temporary key only — the server owns ids. Swapped for the real one on
    // success, and the optimistic row is dropped if the write is rejected (a
    // note over the length cap, say), which it previously wasn't.
    const temp = 'tmp_' + Date.now().toString(36)
    setAnnouncements(prev => [...prev, { id: temp, text }])

    const res = await apiPost('/announcements', { text })
    setAnnouncements(prev => res?.id
      ? prev.map(a => (a.id === temp ? { ...a, id: res.id } : a))
      : prev.filter(a => a.id !== temp))
  }, [])

  const removeAnnouncement = useCallback((id) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id))
    apiDelete(`/announcements/${id}`)
  }, [])

  return { announcements, addAnnouncement, removeAnnouncement }
}

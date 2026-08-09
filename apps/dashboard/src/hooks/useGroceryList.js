import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost, apiDelete } from '../utils/api'
import { useSseRefetch } from './useLiveSync'

// Local-only, replaced by the server's id once the POST lands. The server owns
// ids now, so this never reaches the database — it exists so the optimistic row
// has a stable React key for the moment it's in flight.
function tempId() {
  return 'tmp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
}

export function useGroceryList() {
  const [items, setItems] = useState([])

  const load = useCallback(() => {
    apiGet('/grocery').then(data => {
      if (Array.isArray(data)) setItems(data)
    })
  }, [])

  useEffect(() => { load() }, [load])
  useSseRefetch('grocery', load)

  const addItem = useCallback(async (text) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const temp = tempId()
    setItems(prev => [...prev, { id: temp, item: trimmed }])

    const res = await apiPost('/grocery', { item: trimmed })
    // Swap in the server's id, or drop the optimistic row if the write failed —
    // otherwise a rejected item lingers until reload and its delete 404s.
    setItems(prev => res?.id
      ? prev.map(i => (i.id === temp ? { ...i, id: res.id } : i))
      : prev.filter(i => i.id !== temp))
  }, [])

  const removeItem = useCallback((id) => {
    setItems(prev => prev.filter(i => i.id !== id))
    apiDelete(`/grocery/${id}`)
  }, [])

  const clearAll = useCallback(() => {
    setItems([])
    apiDelete('/grocery')
  }, [])

  return { items, addItem, removeItem, clearAll }
}

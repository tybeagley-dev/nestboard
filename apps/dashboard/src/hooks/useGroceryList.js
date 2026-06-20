import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost, apiDelete } from '../utils/api'
import { useSseRefetch } from './useLiveSync'

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
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

  const addItem = useCallback((text) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const entry = { id: genId(), item: trimmed }
    setItems(prev => [...prev, entry])
    apiPost('/grocery', entry)
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

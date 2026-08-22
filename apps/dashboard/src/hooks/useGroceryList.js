import { useState, useEffect, useCallback, useMemo } from 'react'
import { apiGet, apiPost, apiPatch, apiDelete } from '../utils/api'
import { useSseRefetch } from './useLiveSync'

// Local-only, replaced by the server's id once the POST lands. The server owns
// ids now, so this never reaches the database — it exists so the optimistic row
// has a stable React key for the moment it's in flight.
function tempId() {
  return 'tmp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
}

export const UNASSIGNED = '__unassigned__'

// Items with no store collapse into one trailing bucket; named stores keep the
// order the family last used them in, so the picker and the list agree.
export function groupByStore(items, storeOrder = []) {
  const buckets = new Map()
  for (const item of items) {
    const key = item.store || UNASSIGNED
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(item)
  }

  const named = [...buckets.keys()].filter(k => k !== UNASSIGNED)
  named.sort((a, b) => {
    const ia = storeOrder.indexOf(a)
    const ib = storeOrder.indexOf(b)
    if (ia !== ib) return (ia < 0 ? Infinity : ia) - (ib < 0 ? Infinity : ib)
    return a.localeCompare(b)
  })

  const ordered = named.map(store => ({ store, items: buckets.get(store) }))
  if (buckets.has(UNASSIGNED)) ordered.push({ store: null, items: buckets.get(UNASSIGNED) })
  return ordered
}

export function useGroceryList() {
  const [items, setItems] = useState([])
  const [knownStores, setKnownStores] = useState([])

  const load = useCallback(() => {
    apiGet('/grocery').then(data => {
      if (Array.isArray(data)) setItems(data)
    })
    apiGet('/grocery/stores').then(data => {
      if (Array.isArray(data)) setKnownStores(data)
    })
  }, [])

  useEffect(() => { load() }, [load])
  useSseRefetch('grocery', load)

  // A store the family used before Clear All has no items left to derive it
  // from, so the persisted list is the source of truth and live items only top
  // it up (covers the gap before the family row's broadcast lands).
  const stores = useMemo(() => {
    const seen = new Map()
    for (const name of knownStores) seen.set(name.toLowerCase(), name)
    for (const item of items) {
      if (item.store && !seen.has(item.store.toLowerCase())) seen.set(item.store.toLowerCase(), item.store)
    }
    // Alphabetical everywhere it's shown — the chips, the per-item dropdown, and
    // (via groupByStore) the group order. The server keeps the list
    // most-recent-first, but that order only decides which name gets evicted at
    // the cap; it was never useful to read.
    return [...seen.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  }, [knownStores, items])

  const groups = useMemo(() => groupByStore(items, stores), [items, stores])

  // The create endpoint deliberately ignores a store (it's open to the board and
  // the child pages), so filing at add time is a second, parent-gated PATCH.
  // Callers without parent rights simply pass no store; if one is passed anyway
  // the PATCH 401s and the item stays unassigned rather than failing the add.
  const addItem = useCallback(async (text, store = null) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const cleanStore = typeof store === 'string' && store.trim() ? store.trim() : null
    const temp = tempId()
    setItems(prev => [...prev, { id: temp, item: trimmed, store: cleanStore }])

    const res = await apiPost('/grocery', { item: trimmed })
    // Swap in the server's id, or drop the optimistic row if the write failed —
    // otherwise a rejected item lingers until reload and its delete 404s.
    if (!res?.id) {
      setItems(prev => prev.filter(i => i.id !== temp))
      return
    }
    const id = res.id
    setItems(prev => prev.map(i => (i.id === temp ? { ...i, id } : i)))
    if (!cleanStore) return

    const filed = await apiPatch(`/grocery/${id}`, { store: cleanStore })
    setItems(prev => prev.map(i => (i.id === id ? { ...i, store: filed?.store ?? null } : i)))
    if (filed?.store) {
      setKnownStores(prev =>
        prev.some(s => s.toLowerCase() === filed.store.toLowerCase()) ? prev : [filed.store, ...prev])
    }
  }, [])

  const setItemStore = useCallback(async (id, store) => {
    const cleanStore = typeof store === 'string' && store.trim() ? store.trim() : null
    const previous = items.find(i => i.id === id)?.store ?? null
    setItems(prev => prev.map(i => (i.id === id ? { ...i, store: cleanStore } : i)))

    const res = await apiPatch(`/grocery/${id}`, { store: cleanStore })
    if (!res?.success) {
      setItems(prev => prev.map(i => (i.id === id ? { ...i, store: previous } : i)))
      return
    }
    if (cleanStore) {
      setKnownStores(prev =>
        prev.some(s => s.toLowerCase() === cleanStore.toLowerCase()) ? prev : [cleanStore, ...prev])
    }
  }, [items])

  // Create a store without filing an item under it — the parent portal's
  // top-level "add a store" control.
  const addStore = useCallback(async (name) => {
    const trimmed = typeof name === 'string' ? name.trim() : ''
    if (!trimmed) return
    setKnownStores(prev =>
      prev.some(s => s.toLowerCase() === trimmed.toLowerCase()) ? prev : [trimmed, ...prev])

    const res = await apiPost('/grocery/stores', { name: trimmed })
    if (Array.isArray(res?.stores)) setKnownStores(res.stores)
  }, [])

  const removeItem = useCallback((id) => {
    setItems(prev => prev.filter(i => i.id !== id))
    apiDelete(`/grocery/${id}`)
  }, [])

  const clearAll = useCallback(() => {
    setItems([])
    apiDelete('/grocery')
  }, [])

  return { items, groups, stores, addItem, addStore, setItemStore, removeItem, clearAll }
}

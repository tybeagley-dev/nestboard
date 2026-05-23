import { useState, useEffect, useCallback } from 'react'
import { apiGet } from '../utils/api'

export function useChildren() {
  const [children, setChildren] = useState([])
  const [loading,  setLoading]  = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await apiGet('/children')
    setChildren(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return { children, loading, reload: load }
}

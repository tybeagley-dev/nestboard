import { useState, useEffect, useCallback } from 'react'
import { CONFIG } from '../config/config'
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api'

// API returns snake_case; expose the camelCase alias the UI reads.
const normalizeReward = r => ({ ...r, requiresApproval: r.requires_approval })

export function useRewards() {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await apiGet('/rewards')
    setItems(Array.isArray(data) ? data.map(normalizeReward) : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return { items, loading, reload: load }
}

export async function buyReward(child, itemId) {
  return apiPost(`/rewards/${itemId}/buy`, { child })
}

export function usePurchases(childName) {
  const [purchases, setPurchases] = useState([])
  const [loading,   setLoading]   = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const path = childName
      ? `/rewards/purchases?child=${childName}`
      : '/rewards/purchases'
    const data = await apiGet(path)
    setPurchases(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [childName])

  useEffect(() => { load() }, [load])

  return { purchases, loading, reload: load }
}

export async function redeemPurchase(id) {
  return apiPost(`/rewards/purchases/${id}/redeem`, {}, CONFIG.parentPin)
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function adminGetAllRewards() {
  const data = await apiGet('/rewards?includeInactive=true')
  return Array.isArray(data) ? data.map(normalizeReward) : []
}

export async function adminAddReward(data) {
  return apiPost('/rewards', {
    id:               data.id || Date.now().toString(36),
    label:            data.label,
    icon:             data.icon,
    cost:             data.cost,
    requires_approval: data.requiresApproval ?? false,
  }, CONFIG.parentPin)
}

export async function adminEditReward(data) {
  return apiPut(`/rewards/${data.id}`, {
    label:            data.label,
    icon:             data.icon,
    cost:             data.cost,
    requires_approval: data.requiresApproval ?? false,
    active:           data.active !== false,
  }, CONFIG.parentPin)
}

export async function adminDeleteReward(id) {
  return apiDelete(`/rewards/${id}`, CONFIG.parentPin)
}

import { useState, useEffect } from 'react'
import { apiGet } from '../utils/api'

// Recent ledger entries for one child. spend_events only started recording chore
// earnings in Aug 2026, so the list simply starts wherever the data starts.
export function useTokenHistory(childName, limit = 8) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    apiGet(`/tokens/${encodeURIComponent(childName)}/history?limit=${limit}`).then(data => {
      if (cancelled) return
      setEntries(Array.isArray(data) ? data : [])
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [childName, limit])

  return { entries, loading }
}

const TYPE_LABELS = {
  chore:             'Chore',
  abstinence_reward: 'Screen-free day',
  trade:             'Traded for screen time',
  rewards:           'Reward',
  adjustment:        'Parent adjustment',
}

export function historyLabel(type, labels) {
  if (type === 'rewards') return labels?.rewardsName ?? 'Reward'
  return TYPE_LABELS[type] ?? 'Adjustment'
}

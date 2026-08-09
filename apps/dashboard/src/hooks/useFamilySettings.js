import { useState, useEffect } from 'react'
import { apiGet } from '../utils/api'

// The raw family payload for surfaces that mount outside FamilyProvider — the
// public child view, which has no Clerk session and resolves its family from the
// slug header instead.
//
// Returns the same shape FamilyProvider expects ({ id, name, slug, labels,
// settings, … }), so the child view can supply a real provider rather than
// resolving settings on its own. That matters: useLabels/useSettings fall back to
// generic defaults outside a provider without erroring, so a child page rendering
// kiosk components would silently show "Tokens" instead of the family's label and
// the default 5-tokens-per-10-minutes price instead of the family's real one —
// while the server charged the real amount.
export function useFamilyPayload() {
  const [family, setFamily] = useState(null)
  useEffect(() => {
    apiGet('/auth/family').then(data => setFamily(data ?? null)).catch(() => {})
  }, [])
  return family
}

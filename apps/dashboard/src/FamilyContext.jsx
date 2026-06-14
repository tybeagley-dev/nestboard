import { createContext, useContext } from 'react'

// Generic-core defaults. Families override these via families.labels (custom render).
const DEFAULT_LABELS = {
  tokenName:         'Tokens',
  tokenNameSingular: 'Token',
  rewardsName:       'Rewards Store',
}

const FamilyContext = createContext(null)

export function FamilyProvider({ family, children }) {
  return <FamilyContext.Provider value={family ?? null}>{children}</FamilyContext.Provider>
}

// The raw family payload from /auth/family ({ id, name, slug, labels }), or null
// outside a provider (e.g. the public child view).
export function useFamily() {
  return useContext(FamilyContext)
}

// Resolved display labels with generic defaults applied. Safe to call anywhere —
// falls back to defaults when no family/labels are present.
export function useLabels() {
  const family = useContext(FamilyContext)
  return { ...DEFAULT_LABELS, ...(family?.labels ?? {}) }
}

export { DEFAULT_LABELS }

import { createContext, useContext } from 'react'

// Generic-core defaults. Families override these via families.labels (custom render).
const DEFAULT_LABELS = {
  tokenName:         'Tokens',
  tokenNameSingular: 'Token',
  rewardsName:       'Rewards Store',
}

// Generic-core feature defaults. Empty settings ⇒ every module on, 0 free daily
// screen-time minutes (opt-in), 5 tokens / 10 min. Families override via
// families.settings (PUT /auth/family/settings).
const DEFAULT_SETTINGS = {
  modules:    { screenTime: true, tokens: true, zones: true, meals: true, grocery: true },
  screenTime: { dailyAllotmentMinutes: 0, tokensPerBlock: 5, blockMinutes: 10 },
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

// Resolved feature settings with generic defaults applied. Safe anywhere.
export function useSettings() {
  const family = useContext(FamilyContext)
  return resolveSettings(family?.settings)
}

// Merge raw settings onto defaults. Exported so non-context callers (e.g. the
// public child view, which fetches its own family payload) can resolve too.
export function resolveSettings(raw) {
  const s = raw ?? {}
  return {
    modules:    { ...DEFAULT_SETTINGS.modules,    ...(s.modules ?? {}) },
    screenTime: { ...DEFAULT_SETTINGS.screenTime, ...(s.screenTime ?? {}) },
  }
}

export { DEFAULT_LABELS, DEFAULT_SETTINGS }

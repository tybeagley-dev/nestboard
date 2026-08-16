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
  screenTime: { dailyAllotmentMinutes: 0, tokensPerBlock: 5, blockMinutes: 10, abstinenceEnabled: true, abstinenceTokens: 15 },
  chores:     { dailyTokenTarget: 2 },
  // `completed` tracks the wizard specifically; families.onboarded only means the
  // dashboard is reachable, which "Finish setup later" also grants.
  onboarding: { completed: false, stepKey: '', outstanding: [] },
}

const FamilyContext = createContext(null)

// Separate context so adding a refresh channel doesn't change the shape of the
// value useFamily() returns. Module-level constant: an inline default would be a
// new function identity on every render.
const NO_REFRESH = () => {}
const FamilyRefreshContext = createContext(NO_REFRESH)

// `onRefresh` re-fetches /auth/family in whatever owns the family state. The
// provider-less surfaces (kiosk, child view) pass nothing and get the no-op.
export function FamilyProvider({ family, onRefresh, children }) {
  return (
    <FamilyContext.Provider value={family ?? null}>
      <FamilyRefreshContext.Provider value={onRefresh ?? NO_REFRESH}>
        {children}
      </FamilyRefreshContext.Provider>
    </FamilyContext.Provider>
  )
}

// Call after mutating the family row so the tree re-reads it. Without this an
// edit made in the parent portal doesn't reach the dashboard until a page load —
// FamilyGate stays mounted across route changes, so nothing refetches on nav.
export function useRefreshFamily() {
  return useContext(FamilyRefreshContext)
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
    chores:     { ...DEFAULT_SETTINGS.chores,     ...(s.chores ?? {}) },
    onboarding: { ...DEFAULT_SETTINGS.onboarding, ...(s.onboarding ?? {}) },
  }
}

export { DEFAULT_LABELS, DEFAULT_SETTINGS }

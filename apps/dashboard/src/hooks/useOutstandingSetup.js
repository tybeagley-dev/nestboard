import { useState, useEffect } from 'react'
import { apiGet } from '../utils/api'
import { useSettings } from '../FamilyContext'

// Where each onboarding step lives once the wizard is behind you. Steps whose
// home tab is hidden by a feature flag are dropped below — there's no point
// pointing someone at a tab they turned off.
export const STEP_HOMES = {
  features:  { label: 'Choose your features',   tab: 'settings',  module: null },
  routines:  { label: 'Set up daily routines',  tab: 'routines',  module: null },
  zones:     { label: 'Set up zones',           tab: 'zones',     module: 'zones' },
  chores:    { label: 'Add chores',             tab: 'chores',    module: null },
  meals:     { label: 'Plan meals',             tab: 'meals',     module: 'meals' },
  calendars: { label: 'Connect your calendars', tab: 'calendars', module: null },
  weather:   { label: 'Set your weather',       tab: 'settings',  module: null },
  labels:    { label: 'Name your rewards',      tab: 'settings',  module: 'tokens' },
  identity:  { label: 'Name your board',        tab: 'family',    module: null },
}

// The one definition of "still outstanding", shared by the reminder card and the
// dot on the Parent Panel button. They diverged when each filtered its own way:
// settings.onboarding.outstanding only clears when a parent says so ("Not needed"
// / dismiss), so a family who simply *did* the work emptied the card while the dot
// stayed lit.
//
// `enabled` is false on surfaces with no Clerk session (kiosk), where the status
// call would only ever 401.
export default function useOutstandingSetup(enabled = true) {
  const settings = useSettings()
  // undefined until the check lands — callers use it to avoid rendering a list
  // that's about to shrink.
  const [satisfied, setSatisfied] = useState(undefined)

  const outstanding = settings.onboarding.outstanding ?? []
  const hasAny = outstanding.length > 0

  useEffect(() => {
    if (!enabled || !hasAny) { setSatisfied({}); return }
    // On failure this stays {} rather than undefined: a status check that didn't
    // load should show the full list, never hide it.
    apiGet('/auth/family/setup-status').then(d => setSatisfied(d ?? {}))
  }, [enabled, hasAny])

  const items = outstanding
    .map(key => ({ key, ...STEP_HOMES[key] }))
    .filter(s => s.label && (!s.module || settings.modules[s.module]))
    .filter(s => !satisfied?.[s.key])

  return { items, outstanding, loading: satisfied === undefined }
}

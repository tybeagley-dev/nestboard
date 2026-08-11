import { useState, useEffect, useRef } from 'react'
import { apiPut } from '../utils/api'
import WeatherLocationPicker from './WeatherLocationPicker'
import StepFeatures from '../onboarding/StepFeatures'
import StepLabels from '../onboarding/StepLabels'
import { useFamily, useRefreshFamily, resolveSettings } from '../FamilyContext'

// How the board behaves: which modules are on, what the token economy is called,
// where the weather comes from.
export default function ParentSettingsTab() {
  const family = useFamily()
  const refreshFamily = useRefreshFamily()

  // Toggles have to move on tap, but the family row now lives in FamilyGate and
  // only changes when a refetch lands. `pending` is that gap: it shadows the
  // context value until a fresh row arrives, and the in-flight count keeps a
  // slower first save from clearing a newer one's optimistic state.
  const [pending, setPending] = useState(null)
  const inFlight = useRef(0)
  useEffect(() => { if (inFlight.current === 0) setPending(null) }, [family])

  const settings = resolveSettings(pending ?? family?.settings)

  function saveSettings(partial) {
    const next = {
      modules:    { ...settings.modules,    ...(partial.modules ?? {}) },
      screenTime: { ...settings.screenTime, ...(partial.screenTime ?? {}) },
      chores:     { ...settings.chores,     ...(partial.chores ?? {}) },
    }
    setPending(next)
    inFlight.current++
    apiPut('/auth/family/settings', next).finally(() => {
      inFlight.current--
      refreshFamily()
    })
  }

  if (!family) return <p className="parent-soon-msg">Loading…</p>

  return (
    <div className="parent-family-tab">
      <div className="family-code-card">
        <div className="family-code-section">
          <span className="family-code-label">Features</span>
          <StepFeatures
            modules={settings.modules}
            screenTime={settings.screenTime}
            chores={settings.chores}
            onChange={saveSettings}
            help="Turn a module off to hide it everywhere — the board, the child pages, and the tabs here. Changes take effect right away."
          />
        </div>
      </div>

      {settings.modules.tokens && (
        <div className="family-code-card">
          <div className="family-code-section">
            <span className="family-code-label">Token economy names</span>
            <StepLabels />
          </div>
        </div>
      )}

      <div className="family-code-card">
        <div className="family-code-section">
          <span className="family-code-label">Weather location</span>
          <WeatherLocationPicker
            current={family.weather ?? null}
            onSaved={refreshFamily}
          />
        </div>
      </div>
    </div>
  )
}

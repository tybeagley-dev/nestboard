import { useState, useEffect } from 'react'
import { apiGet, apiPut } from '../utils/api'
import ChangePinCard from './ChangePinCard'
import FeedbackCard from './FeedbackCard'
import { resolveSettings } from '../FamilyContext'
import WeatherLocationPicker from './WeatherLocationPicker'
import FamilyMembers from './FamilyMembers'
import StepFeatures from '../onboarding/StepFeatures'
import StepLabels from '../onboarding/StepLabels'

export default function ParentFamilyTab({ onPinChanged }) {
  const [family, setFamily] = useState(null)

  useEffect(() => {
    apiGet('/auth/family').then(data => { if (data?.id) setFamily(data) })
  }, [])

  const settings = resolveSettings(family?.settings)
  function saveSettings(partial) {
    const next = {
      modules:    { ...settings.modules,    ...(partial.modules ?? {}) },
      screenTime: { ...settings.screenTime, ...(partial.screenTime ?? {}) },
    }
    setFamily(f => ({ ...f, settings: next }))
    apiPut('/auth/family/settings', next)
  }

  if (!family) return <p className="parent-soon-msg">Loading…</p>

  return (
    <div className="parent-family-tab">
      <div className="family-code-card">
        <div className="family-code-header">
          <span className="family-code-name">{family.name}</span>
        </div>
      </div>

      <FamilyMembers familySlug={family.slug} />

      <ChangePinCard onPinChanged={onPinChanged} />

      <div className="family-code-card">
        <div className="family-code-section">
          <span className="family-code-label">Features</span>
          <StepFeatures
            modules={settings.modules}
            screenTime={settings.screenTime}
            onChange={saveSettings}
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
            onSaved={w => setFamily(f => ({ ...f, weather: w }))}
          />
        </div>
      </div>

      <FeedbackCard />
    </div>
  )
}

import { useState } from 'react'
import { apiPut } from '../utils/api'
import { useRefreshFamily } from '../FamilyContext'
import useOutstandingSetup from '../hooks/useOutstandingSetup'

// Shown on the Parent Panel landing tab when onboarding was left unfinished.
// Reads settings.onboarding.outstanding, which both "Skip for now" and
// "Save and finish setup later" write.
export default function FinishSetupCard({ onGoToTab }) {
  const refresh = useRefreshFamily()
  const [busy, setBusy] = useState(false)
  const { items, outstanding, loading } = useOutstandingSetup()

  if (loading) return null

  // Deliberately not gated on `onboarding.completed`: someone can walk the wizard
  // end to end while skipping steps along the way, and they still want the list.
  // `completed` stays a pure analytics flag.
  if (items.length === 0) return null

  // Clearing `outstanding` is what hides this for good — the wizard itself stays
  // gated on families.onboarded, so dismissing can't strand anyone back in it.
  async function dismiss() {
    setBusy(true)
    await apiPut('/auth/family/settings', { onboarding: { outstanding: [] } })
    refresh()
  }

  // Filters the stored list, not the rendered one: a step hidden here because its
  // module is off must survive in case the family turns that module back on.
  async function done(key) {
    setBusy(true)
    await apiPut('/auth/family/settings', {
      onboarding: { outstanding: outstanding.filter(k => k !== key) },
    })
    refresh()
    setBusy(false)
  }

  return (
    <div className="finish-setup-card">
      <div className="finish-setup-head">
        <div>
          <p className="finish-setup-title">Finish setting up</p>
          <p className="finish-setup-help">
            You skipped {items.length === 1 ? 'one thing' : `${items.length} things`} during setup.
            Pick any of them up whenever it suits.
          </p>
        </div>
        <button className="finish-setup-dismiss" onClick={dismiss} disabled={busy} aria-label="Dismiss setup reminder">
          ×
        </button>
      </div>

      <div className="finish-setup-items">
        {items.map(item => (
          <div key={item.key} className="finish-setup-item">
            <button className="finish-setup-go" onClick={() => onGoToTab(item.tab)}>
              {item.label}
            </button>
            <button
              className="finish-setup-skip"
              onClick={() => done(item.key)}
              disabled={busy}
              title="Remove this from the list"
            >
              Not needed
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

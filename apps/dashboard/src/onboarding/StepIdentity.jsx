import { useState } from 'react'
import { apiPut } from '../utils/api'
import { getGreeting } from '../utils/dateUtils'
import { greetingLine } from '../utils/greeting'
import { useFamily, useRefreshFamily } from '../FamilyContext'

// Family name + the board's greeting line, edited together because one is the
// default for the other.
//
// Separate fields on purpose: `name` is the family ("Beagley") and appears on
// invites and in the parent portal, while the board wants to address them
// ("Beagley's", "Team Beagley"). One string can't do both jobs without one of the
// two reading badly. The preview is the point — a bare text box asking for a
// "greeting" is a puzzle; the same box under a live headline isn't.
//
// Bare like the other onboarding steps; ParentFamilyTab supplies the card chrome.
export default function StepIdentity() {
  const family = useFamily()
  const refreshFamily = useRefreshFamily()
  const [name, setName]         = useState(family?.name ?? '')
  const [greeting, setGreeting] = useState(family?.greeting ?? '')
  const [saving, setSaving]     = useState(false)
  const [saved,  setSaved]      = useState(false)
  const [error,  setError]      = useState(null)

  // Falls back to the derived line the same way the board does, so an empty field
  // previews what will actually render rather than a truncated headline.
  const preview = greetingLine({ name, greeting })

  function edit(setter) {
    return e => { setter(e.target.value); setSaved(false); setError(null) }
  }

  async function save() {
    if (!name.trim()) return setError('Family name cannot be empty')
    setSaving(true)
    const res = await apiPut('/auth/family/identity', { name: name.trim(), greeting: greeting.trim() })
    setSaving(false)
    if (!res?.success) return setError('Could not save — try again')
    setSaved(true)
    // FamilyGate holds the copy the board renders from, and it stays mounted
    // across navigation — without this the greeting is stale until a page load.
    refreshFamily()
  }

  return (
    <div className="onboarding-identity">
      <div className="chore-form-field">
        <label className="chore-form-label">Family name</label>
        <input
          className="chore-form-input"
          value={name}
          onChange={edit(setName)}
          placeholder="Beagley"
          maxLength={120}
        />
        <p className="chore-form-hint">Used on invites and in the parent portal.</p>
      </div>

      <div className="greeting-preview" aria-hidden="true">
        <span className="greeting-preview-label">Your board shows</span>
        <p className="greeting-preview-line">
          {getGreeting(new Date())},<br />{preview || '…'}
        </p>
      </div>

      <div className="chore-form-field">
        <label className="chore-form-label">Greeting</label>
        <input
          className="chore-form-input"
          value={greeting}
          onChange={edit(setGreeting)}
          placeholder={name.trim() ? `${name.trim()}!` : 'Beagley!'}
          maxLength={120}
        />
        <p className="chore-form-hint">
          Everything after the comma — punctuation included. Leave blank to use your family name.
        </p>
      </div>

      {error && <p className="family-setup-error">{error}</p>}

      <button className="parent-apply-btn" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
      </button>
    </div>
  )
}

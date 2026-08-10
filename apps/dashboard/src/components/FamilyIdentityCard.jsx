import { useState } from 'react'
import { apiPut } from '../utils/api'
import { getGreeting } from '../utils/dateUtils'
import { greetingLine } from '../utils/greeting'
import { useRefreshFamily } from '../FamilyContext'

// Family name + the board's greeting line, edited together because one is the
// default for the other.
//
// They're separate fields on purpose: `name` is the family ("Beagley") and shows
// up on invites and in the parent portal, while the board wants to address them
// ("Beagley's", "Team Beagley"). Forcing one string to do both jobs meant picking
// which of the two read badly. The preview is the point — a blank second text box
// asking for a "greeting" is a puzzle; the same box under a live headline isn't.
export default function FamilyIdentityCard({ family, onSaved }) {
  const [name, setName]         = useState(family?.name ?? '')
  const [greeting, setGreeting] = useState(family?.greeting ?? '')
  const [status, setStatus]     = useState(null) // 'saving' | 'saved' | error string
  const refreshFamily = useRefreshFamily()

  // Preview falls back to the derived line the same way the board does, so an
  // empty field shows what will actually render rather than a truncated headline.
  const preview = greetingLine({ name, greeting })

  async function save(e) {
    e.preventDefault()
    if (!name.trim()) return setStatus('Family name cannot be empty')
    setStatus('saving')
    const res = await apiPut('/auth/family/identity', { name: name.trim(), greeting: greeting.trim() })
    if (!res?.success) return setStatus('Could not save — try again')
    setStatus('saved')
    onSaved?.({ name: res.name, greeting: res.greeting })
    // The dashboard reads the family from FamilyGate's copy, not this card's, and
    // FamilyGate stays mounted across navigation — without this the board keeps
    // showing the old greeting until the page is reloaded.
    refreshFamily()
  }

  return (
    <div className="family-code-card">
      <form className="family-code-section" onSubmit={save}>
        <span className="family-code-label">Family name & greeting</span>

        <div className="family-setup-field">
          <label className="family-setup-label">Family name</label>
          <input
            className="family-setup-input"
            value={name}
            onChange={e => { setName(e.target.value); setStatus(null) }}
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

        <div className="family-setup-field">
          <label className="family-setup-label">Greeting</label>
          <input
            className="family-setup-input"
            value={greeting}
            onChange={e => { setGreeting(e.target.value); setStatus(null) }}
            placeholder={name.trim() ? `${name.trim()}!` : 'Beagley!'}
            maxLength={120}
          />
          <p className="chore-form-hint">
            Everything after the comma — punctuation included. Leave it blank to use your family name.
          </p>
        </div>

        {status && status !== 'saving' && status !== 'saved' && (
          <p className="family-setup-error">{status}</p>
        )}
        {status === 'saved' && <p className="family-code-hint">Saved.</p>}

        <button className="family-setup-submit" type="submit" disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : 'Save'}
        </button>
      </form>
    </div>
  )
}

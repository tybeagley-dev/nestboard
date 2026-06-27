import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPost } from '../utils/api'

// Records acceptance of the current ToS + Privacy versions before a signed-in
// user reaches family setup, the dashboard, or invite-accept. The server returns
// both the current versions and the user's latest acceptance, so the comparison
// can't drift into a re-prompt loop. Catches new users, invited parents, and
// future version bumps in one place.
function needsConsent(data) {
  if (!data?.current) return false // request failed — handled separately
  const { current, accepted } = data
  return !accepted
    || accepted.privacyVersion !== current.privacyVersion
    || accepted.tosVersion !== current.tosVersion
}

export default function ConsentGate({ children }) {
  const [data, setData] = useState(undefined) // undefined = loading, null = failed
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    apiGet('/auth/consent').then(d => setData(d ?? null))
  }, [])

  useEffect(() => { load() }, [load])

  async function accept() {
    setBusy(true)
    const res = await apiPost('/auth/consent', {})
    setBusy(false)
    if (res?.success) load()
  }

  if (data === undefined) return null
  if (data === null) {
    return (
      <div className="consent-wrap">
        <div className="consent-card">
          <p>Couldn’t load the latest terms.</p>
          <button className="family-setup-submit" onClick={load}>Retry</button>
        </div>
      </div>
    )
  }
  if (!needsConsent(data)) return children

  return (
    <div className="consent-wrap">
      <div className="consent-card">
        <h1 className="consent-title">Before you start</h1>
        <p className="consent-body">
          nestboard is in beta. Please review and accept our terms to continue.
        </p>
        <p className="consent-body">
          Read the <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>.
        </p>

        <label className="consent-check">
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
          <span>
            I am 18 or older and the parent or legal guardian of any children whose
            information I enter. I agree to the Terms of Service and Privacy Policy.
          </span>
        </label>

        <button
          className="family-setup-submit"
          disabled={!agreed || busy}
          onClick={accept}
        >
          {busy ? 'One moment…' : 'Agree and continue'}
        </button>
      </div>
    </div>
  )
}

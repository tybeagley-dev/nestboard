import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiGet, apiPost } from './utils/api'

// Invite-accept screen at /join/:token. The user is already signed in (AuthGate),
// but not necessarily in a family — accepting adds the membership, then drops
// them into the dashboard (or onboarding, if the family isn't set up yet).
export default function JoinInvite() {
  const { token } = useParams()
  const navigate  = useNavigate()
  const [invite,  setInvite]  = useState(undefined) // undefined = loading
  const [joining, setJoining] = useState(false)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    apiGet(`/auth/invites/${token}`).then(data => {
      setInvite(data && !data.error ? data : null)
    })
  }, [token])

  async function accept() {
    setJoining(true)
    setError(null)
    const data = await apiPost(`/auth/invites/${token}/accept`, {})
    setJoining(false)
    if (data?.id) {
      navigate('/', { replace: true })
    } else {
      setError(data?.error ?? 'Could not join — the invite may have expired.')
    }
  }

  if (invite === undefined) return null

  const usable = invite && invite.valid

  return (
    <div className="family-setup-wrap">
      <div className="family-setup-card">
        <img className="family-setup-logo" src="/logo.png" alt="nestboard" />
        {!usable ? (
          <>
            <h1 className="family-setup-title">Invite not valid</h1>
            <p className="family-setup-subtitle">
              This invite link is invalid, expired, or already used. Ask the family to send a new one.
            </p>
            <button className="family-setup-submit" onClick={() => navigate('/', { replace: true })}>
              Go to nestboard
            </button>
          </>
        ) : (
          <>
            <h1 className="family-setup-title">Join {invite.familyName}</h1>
            <p className="family-setup-subtitle">
              You've been invited to join the {invite.familyName} family dashboard.
            </p>
            {error && <p className="family-setup-error">{error}</p>}
            <button className="family-setup-submit" onClick={accept} disabled={joining}>
              {joining ? 'Joining…' : `Join ${invite.familyName}`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

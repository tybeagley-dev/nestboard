import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/react'
import { apiGet, apiPost, apiDelete } from '../utils/api'

export default function FamilyMembers({ familySlug }) {
  const { user } = useUser()
  const [members,     setMembers]     = useState([])
  const [invites,     setInvites]     = useState([])
  const [creating,    setCreating]    = useState(false)
  const [copiedToken, setCopiedToken] = useState(null)
  const [copiedCode,  setCopiedCode]  = useState(false)

  const load = useCallback(() => {
    apiGet('/auth/family/members').then(d => setMembers(Array.isArray(d) ? d : []))
    apiGet('/auth/family/invites').then(d => setInvites(Array.isArray(d) ? d : []))
  }, [])

  useEffect(() => { load() }, [load])

  async function createInvite() {
    setCreating(true)
    const data = await apiPost('/auth/family/invites', {})
    setCreating(false)
    if (data?.token) load()
  }

  async function revokeInvite(token) {
    await apiDelete(`/auth/family/invites/${token}`)
    load()
  }

  async function removeMember(userId) {
    await apiDelete(`/auth/family/members/${userId}`)
    load()
  }

  function inviteLink(token) {
    return `${window.location.origin}/join/${token}`
  }

  function copyLink(token) {
    navigator.clipboard.writeText(inviteLink(token))
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  function copyCode() {
    if (!familySlug) return
    navigator.clipboard.writeText(familySlug)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  return (
    <>
      <div className="family-code-card">
        <div className="family-code-section">
          <span className="family-code-label">Members</span>
          <ul className="member-list">
            {members.map(m => (
              <li key={m.user_id} className="member-row">
                <span className="member-email">{m.email}</span>
                <span className="member-role">{m.role}</span>
                {m.role !== 'owner' && m.user_id !== user?.id && (
                  <button className="member-remove" onClick={() => removeMember(m.user_id)}>Remove</button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="family-code-card">
        <div className="family-code-section">
          <span className="family-code-label">Invite a parent</span>
          <p className="family-code-hint">
            Send a private link — they join in one tap, no code to type. Single-use, expires in 7 days. (They'll use the family PIN as the adult unlock, same as you.)
          </p>
          <button className="parent-apply-btn" onClick={createInvite} disabled={creating}>
            {creating ? 'Creating…' : '+ Create invite link'}
          </button>
          {invites.length > 0 && (
            <ul className="invite-list">
              {invites.map(inv => (
                <li key={inv.token} className="invite-row">
                  <code className="invite-link">{inviteLink(inv.token)}</code>
                  <button className="family-code-copy" onClick={() => copyLink(inv.token)}>
                    {copiedToken === inv.token ? 'Copied!' : 'Copy'}
                  </button>
                  <button className="member-remove" onClick={() => revokeInvite(inv.token)}>Revoke</button>
                </li>
              ))}
            </ul>
          )}

          {familySlug && (
            <details className="family-code-fallback">
              <summary>Can't use a link? Use your family code</summary>
              <p className="family-code-hint">
                Share this code plus your parent PIN, and they enter both on the sign-in screen.
              </p>
              <div className="family-code-row">
                <code className="family-code-value">{familySlug}</code>
                <button className="family-code-copy" onClick={copyCode}>
                  {copiedCode ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </details>
          )}
        </div>
      </div>
    </>
  )
}

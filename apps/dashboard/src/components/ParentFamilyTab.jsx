import { useState, useEffect } from 'react'
import { apiGet } from '../utils/api'

export default function ParentFamilyTab() {
  const [family,  setFamily]  = useState(null)
  const [copied,  setCopied]  = useState(false)

  useEffect(() => {
    apiGet('/auth/family').then(data => { if (data?.id) setFamily(data) })
  }, [])

  function handleCopy() {
    if (!family?.slug) return
    navigator.clipboard.writeText(family.slug)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!family) return <p className="parent-soon-msg">Loading…</p>

  return (
    <div className="parent-family-tab">
      <div className="family-code-card">
        <div className="family-code-header">
          <span className="family-code-name">{family.name}</span>
        </div>

        <div className="family-code-section">
          <span className="family-code-label">Family code</span>
          <div className="family-code-row">
            <code className="family-code-value">{family.slug}</code>
            <button className="family-code-copy" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="family-code-hint">
            Share this code and your parent PIN with anyone you want to add to this family. They'll use both to join from the sign-in screen.
          </p>
        </div>
      </div>
    </div>
  )
}

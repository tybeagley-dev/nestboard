import { useState, useEffect } from 'react'
import { apiGet } from '../utils/api'
import WeatherLocationPicker from './WeatherLocationPicker'
import FamilyMembers from './FamilyMembers'

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
            A fallback way to join: share this code and your parent PIN, and they enter both on the sign-in screen. The easier path is an invite link below.
          </p>
        </div>
      </div>

      <FamilyMembers />

      <div className="family-code-card">
        <div className="family-code-section">
          <span className="family-code-label">Weather location</span>
          <WeatherLocationPicker
            current={family.weather ?? null}
            onSaved={w => setFamily(f => ({ ...f, weather: w }))}
          />
        </div>
      </div>
    </div>
  )
}

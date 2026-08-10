import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

// The link to install on a shared family display.
//
// Deliberately not the same as signing in on that device: the kiosk link carries
// no Clerk session, so the tablet can't reach the parent portal, settings, or
// anything account-level. It does everything a family board should — routines,
// chores, timers, tokens, meals, grocery — because all of that is reachable with
// the family slug alone.
export default function KioskLinkCard({ familySlug }) {
  const [copied, setCopied] = useState(false)
  if (!familySlug) return null

  const url = `${window.location.origin}/${familySlug}/kiosk`

  function copy() {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="family-code-card">
      <div className="family-code-section">
        <span className="family-code-label">Family display</span>
        <p className="family-code-hint">
          Open this on a tablet you leave out for everyone — the fridge, the kitchen counter. It shows
          the whole board and lets children check things off, spin chores and run timers, but it can't
          reach approvals, settings or your account. That's the point: a screen the whole house can
          reach shouldn't carry a parent login. Approvals happen on your phone, signed in.
        </p>

        <div className="kiosk-link-row">
          <code className="invite-link">{url}</code>
          <button className="family-code-copy" onClick={copy}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="kiosk-qr-wrap">
          <QRCodeSVG value={url} size={128} level="H" bgColor="transparent" />
        </div>

        <p className="chore-form-hint">
          Asks for the family PIN once on a new device, then remembers it.
        </p>
      </div>
    </div>
  )
}

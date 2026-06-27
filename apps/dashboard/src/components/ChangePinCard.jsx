import { useState } from 'react'
import { apiPut } from '../utils/api'

// Reset the family parent PIN. The dashboard user is a Clerk-authed parent, so
// the server lets them set a new PIN without the old one (this is also the
// forgot-PIN recovery path). We still confirm the new PIN to catch typos.
export default function ChangePinCard({ onPinChanged }) {
  const [pin,    setPin]    = useState('')
  const [conf,   setConf]   = useState('')
  const [status, setStatus] = useState(null) // 'saving' | 'saved' | error string

  const onlyDigits = v => v.replace(/\D/g, '').slice(0, 6)

  async function save(e) {
    e.preventDefault()
    if (!/^\d{6}$/.test(pin))  return setStatus('PIN must be exactly 6 digits')
    if (pin !== conf)          return setStatus('PINs don’t match')
    setStatus('saving')
    const res = await apiPut('/auth/family/pin', { newPin: pin })
    if (!res?.success) return setStatus('Could not update PIN — try again')
    setPin('')
    setConf('')
    setStatus('saved')
    // Re-lock the parent portal so the new PIN must be entered to continue.
    onPinChanged?.()
  }

  return (
    <div className="family-code-card">
      <form className="family-code-section" onSubmit={save}>
        <span className="family-code-label">Parent PIN</span>
        <p className="family-code-hint">
          Sets a new PIN for approvals and parent mode. You don’t need the old one.
        </p>

        <div className="family-setup-field">
          <label className="family-setup-label">New PIN</label>
          <input
            className="family-setup-input"
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={e => { setPin(onlyDigits(e.target.value)); setStatus(null) }}
            placeholder="6 digits"
            maxLength={6}
          />
        </div>

        <div className="family-setup-field">
          <label className="family-setup-label">Confirm new PIN</label>
          <input
            className="family-setup-input"
            type="password"
            inputMode="numeric"
            value={conf}
            onChange={e => { setConf(onlyDigits(e.target.value)); setStatus(null) }}
            placeholder="Repeat PIN"
            maxLength={6}
          />
        </div>

        {status && status !== 'saving' && status !== 'saved' && (
          <p className="family-setup-error">{status}</p>
        )}
        {status === 'saved' && <p className="family-code-hint">PIN updated.</p>}

        <button className="family-setup-submit" type="submit" disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : 'Update PIN'}
        </button>
      </form>
    </div>
  )
}

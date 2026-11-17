import { useState } from 'react'
import { apiPost } from './utils/api'

export default function FamilySetup({ onComplete }) {
  const [name,    setName]    = useState('')
  const [pin,     setPin]     = useState('')
  const [pinConf, setPinConf] = useState('')
  const [error,   setError]   = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (pin !== pinConf) {
      setError('PINs do not match')
      return
    }
    if (!/^\d{6}$/.test(pin)) {
      setError('PIN must be exactly 6 digits')
      return
    }

    setLoading(true)
    try {
      const data = await apiPost('/auth/families', { name, pin })
      if (data?.error) { setError(data.error); return }
      onComplete(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="family-setup-wrap">
      <div className="family-setup-card">
        <img className="family-setup-logo" src="/logo.png" alt="nestboard" />
        <h1 className="family-setup-title">Welcome to nestboard</h1>
        <p className="family-setup-subtitle">Set up your family dashboard.</p>

        <form className="family-setup-form" onSubmit={handleSubmit}>
          <div className="family-setup-field">
            <label className="family-setup-label">Family name</label>
            <input
              className="family-setup-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. The Johnsons"
              required
              autoFocus
            />
          </div>

          <div className="family-setup-field">
            <label className="family-setup-label">Set a PIN</label>
            <input
              className="family-setup-input"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6 digits"
              maxLength={6}
              required
            />
          </div>

          <div className="family-setup-field">
            <label className="family-setup-label">Confirm PIN</label>
            <input
              className="family-setup-input"
              type="password"
              inputMode="numeric"
              value={pinConf}
              onChange={e => setPinConf(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Repeat PIN"
              maxLength={6}
              required
            />
          </div>

          {error && <p className="family-setup-error">{error}</p>}

          <button
            className="family-setup-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? 'One moment…' : 'Create my family'}
          </button>
        </form>

        <p className="family-setup-subtitle">
          Joining an existing family? Ask a parent to send you an invite link.
        </p>
      </div>
    </div>
  )
}

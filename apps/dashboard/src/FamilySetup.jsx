import { useState } from 'react'
import { apiPost } from './utils/api'

export default function FamilySetup({ onComplete }) {
  const [mode,    setMode]    = useState('create') // 'create' | 'join'
  const [name,    setName]    = useState('')
  const [slug,    setSlug]    = useState('')
  const [pin,     setPin]     = useState('')
  const [pinConf, setPinConf] = useState('')
  const [error,   setError]   = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (mode === 'create' && pin !== pinConf) {
      setError('PINs do not match')
      return
    }
    if (!/^\d{6}$/.test(pin)) {
      setError('PIN must be exactly 6 digits')
      return
    }

    setLoading(true)
    try {
      const endpoint = mode === 'create' ? '/auth/families' : '/auth/families/join'
      const body     = mode === 'create' ? { name, pin } : { slug, pin }
      const data     = await apiPost(endpoint, body)

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
        <p className="family-setup-subtitle">
          {mode === 'create'
            ? 'Set up your family dashboard.'
            : 'Join an existing family dashboard.'}
        </p>

        <div className="family-setup-tabs">
          <button
            className={`family-setup-tab ${mode === 'create' ? 'active' : ''}`}
            onClick={() => { setMode('create'); setError(null) }}
            type="button"
          >
            Create family
          </button>
          <button
            className={`family-setup-tab ${mode === 'join' ? 'active' : ''}`}
            onClick={() => { setMode('join'); setError(null) }}
            type="button"
          >
            Join family
          </button>
        </div>

        <form className="family-setup-form" onSubmit={handleSubmit}>
          {mode === 'create' && (
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
          )}

          {mode === 'join' && (
            <div className="family-setup-field">
              <label className="family-setup-label">Family code</label>
              <input
                className="family-setup-input"
                value={slug}
                onChange={e => setSlug(e.target.value)}
                placeholder="Get this from the family owner"
                required
                autoFocus
              />
            </div>
          )}

          <div className="family-setup-field">
            <label className="family-setup-label">
              {mode === 'create' ? 'Set a PIN' : 'Family PIN'}
            </label>
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

          {mode === 'create' && (
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
          )}

          {error && <p className="family-setup-error">{error}</p>}

          <button
            className="family-setup-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? 'One moment…' : mode === 'create' ? 'Create my family' : 'Join family'}
          </button>
        </form>
      </div>
    </div>
  )
}

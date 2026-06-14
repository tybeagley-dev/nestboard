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
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits')
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
              onChange={e => setPin(e.target.value)}
              placeholder="4+ digits"
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
                onChange={e => setPinConf(e.target.value)}
                placeholder="Repeat PIN"
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

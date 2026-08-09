import { useState, useEffect, useRef } from 'react'
import { apiPostResult, setParentToken } from '../utils/api'

function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

const PIN_LENGTH = 6

export default function PinModal({ onSuccess, onCancel, prompt = 'Adult PIN required', dismissable = true }) {
  const [pin,   setPin]   = useState('')
  const [error, setError] = useState(false)
  const [busy,  setBusy]  = useState(false)
  // Seconds remaining on a rate-limit lockout. The server locks a family after
  // repeated failures, and without this the modal reported "Incorrect PIN" for
  // the whole window — including for the correct PIN — with no hint that waiting
  // was the fix.
  const [lockedFor, setLockedFor] = useState(0)
  const inputRef = useRef(null)
  const touch = isTouchDevice()

  useEffect(() => {
    if (lockedFor <= 0) return
    const id = setInterval(() => setLockedFor(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [lockedFor > 0])

  useEffect(() => {
    if (touch) {
      // Small delay so the page is fully rendered before focusing
      const t = setTimeout(() => inputRef.current?.focus(), 100)
      return () => clearTimeout(t)
    }
  }, [touch])

  useEffect(() => {
    if (touch) return
    function onKey(e) {
      if (e.key === 'Escape')    { if (dismissable) onCancel(); return }
      if (e.key === 'Backspace') { handleBackspace(); return }
      if (/^\d$/.test(e.key))   { handleDigit(e.key) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pin, onCancel, touch, dismissable])

  async function verify(candidate) {
    setBusy(true)
    const { status, data } = await apiPostResult('/auth/parent', { pin: candidate })
    setBusy(false)

    if (data?.token) {
      setParentToken(data.token)
      onSuccess()
      return
    }

    // 429 is the family lockout, not a wrong PIN — say so, and count it down.
    if (status === 429) {
      setLockedFor(Number(data?.retryAfterSec) || 60)
      setError(false)
    } else {
      setError(true)
    }
    setTimeout(() => {
      setPin('')
      if (inputRef.current) inputRef.current.value = ''
    }, 600)
  }

  function handleDigit(d) {
    if (busy || lockedFor > 0 || pin.length >= PIN_LENGTH) return
    const next = pin + d
    setPin(next)
    setError(false)
    if (next.length === PIN_LENGTH) verify(next)
  }

  function handleBackspace() {
    setPin(p => p.slice(0, -1))
    setError(false)
  }

  return (
    <div className="modal-backdrop" onMouseDown={e => dismissable && e.target === e.currentTarget && onCancel()}>
      <div className="modal-card pin-modal" onClick={() => touch && inputRef.current?.focus()}>
        {dismissable && <button className="modal-close" onClick={onCancel} aria-label="Close">×</button>}
        <div
          className="tokens-pin-phase"
          onClick={() => touch && inputRef.current?.focus()}
        >
          {touch && (
            <input
              ref={inputRef}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={e => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH)
                const added = digits.slice(pin.length)
                for (const d of added) handleDigit(d)
              }}
              className="pin-hidden-input"
              autoComplete="off"
            />
          )}
          <p className="pin-prompt">{prompt}</p>
          <div className={`pin-dots ${error || lockedFor > 0 ? 'pin-error' : ''}`}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} />
            ))}
          </div>
          {lockedFor > 0 ? (
            <p className="pin-error-msg">
              Too many attempts — try again in {lockedFor > 60
                ? `${Math.ceil(lockedFor / 60)} min`
                : `${lockedFor}s`}
            </p>
          ) : error && <p className="pin-error-msg">Incorrect PIN</p>}
          {!touch && (
            <div className="numpad">
              {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => (
                k === '' ? <div key={i} /> :
                <button
                  key={i}
                  className="numpad-key"
                  onClick={() => k === '⌫' ? handleBackspace() : handleDigit(k)}
                >
                  {k}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

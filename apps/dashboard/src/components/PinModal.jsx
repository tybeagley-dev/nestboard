import { useState, useEffect, useRef } from 'react'
import { apiPost, setParentToken } from '../utils/api'

function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

const PIN_LENGTH = 6

export default function PinModal({ onSuccess, onCancel, prompt = 'Adult PIN required', dismissable = true }) {
  const [pin,   setPin]   = useState('')
  const [error, setError] = useState(false)
  const [busy,  setBusy]  = useState(false)
  const inputRef = useRef(null)
  const touch = isTouchDevice()

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
    const data = await apiPost('/auth/parent', { pin: candidate })
    setBusy(false)
    if (data?.token) {
      setParentToken(data.token)
      onSuccess()
    } else {
      setError(true)
      setTimeout(() => {
        setPin('')
        if (inputRef.current) inputRef.current.value = ''
      }, 600)
    }
  }

  function handleDigit(d) {
    if (busy || pin.length >= PIN_LENGTH) return
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
          <div className={`pin-dots ${error ? 'pin-error' : ''}`}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} />
            ))}
          </div>
          {error && <p className="pin-error-msg">Incorrect PIN</p>}
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

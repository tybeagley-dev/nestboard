import { useState, useEffect, useRef } from 'react'
import { CONFIG } from '../config/config'

function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

const PIN_LENGTH = 6

export default function PinModal({ onSuccess, onCancel, prompt = 'Adult PIN required' }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const inputRef = useRef(null)
  const touch = isTouchDevice()

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { onCancel(); return }
      if (touch) return
      if (e.key === 'Backspace') { handleBackspace(); return }
      if (/^\d$/.test(e.key)) { handleDigit(e.key) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pin, onCancel, touch])

  function handleDigit(d) {
    if (pin.length >= PIN_LENGTH) return
    const next = pin + d
    setPin(next)
    setError(false)
    if (next.length === PIN_LENGTH) {
      if (next === (CONFIG.parentPin ?? '052115')) {
        onSuccess()
      } else {
        setError(true)
        setTimeout(() => {
          setPin('')
          if (inputRef.current) inputRef.current.value = ''
        }, 600)
      }
    }
  }

  function handleBackspace() {
    setPin(p => p.slice(0, -1))
    setError(false)
  }

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal-card pin-modal">
        <button className="modal-close" onClick={onCancel} aria-label="Close">×</button>
        <div className="bucks-pin-phase">
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
              autoFocus
            />
          )}
          <p className="pin-prompt">{prompt}</p>
          <div className={`pin-dots ${error ? 'pin-error' : ''}`}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} />
            ))}
          </div>
          {error && <p className="pin-error-msg">Incorrect PIN</p>}
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
        </div>
      </div>
    </div>
  )
}

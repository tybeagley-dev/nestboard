import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { apiPostResult, setParentToken } from '../utils/api'

function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

const PIN_LENGTH = 6

// `pair` switches what a correct PIN buys. Without it the PIN unlocks a parent
// session (the portal). With it — { label, kind, childId } — the PIN pairs this
// device instead, trading itself for a per-device token the server can revoke.
// Same modal either way: the lockout countdown, the numpad and the touch focus
// handling are fiddly enough that a second copy would drift.
export default function PinModal({ onSuccess, onCancel, prompt = 'Adult PIN required', dismissable = true, pair = null }) {
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

  // iOS opens the keyboard only for a focus() that runs synchronously inside the
  // user gesture that mounted this modal. The old setTimeout landed in a later
  // task, so focus succeeded but the keyboard stayed shut and you had to tap the
  // dots to get it. useLayoutEffect runs inside React's synchronous flush of the
  // discrete tap that navigated here, which is still within that gesture.
  //
  // Arriving without a gesture — a direct URL, a PWA cold start — can't work:
  // no browser opens a keyboard unprompted. The tap-to-focus handlers below stay
  // as the fallback for that case.
  useLayoutEffect(() => {
    if (touch) inputRef.current?.focus()
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
    const { status, data } = pair
      ? await apiPostResult('/auth/device/pair', { pin: candidate, ...pair })
      : await apiPostResult('/auth/parent', { pin: candidate })
    setBusy(false)

    if (data?.token) {
      // A device token is this device's long-lived credential and is stored by
      // the caller; a parent token is a 30-minute session and lives in memory.
      if (!pair) setParentToken(data.token)
      onSuccess(data)
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
                if (busy || lockedFor > 0) return
                const digits = e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH)
                // Deleting has to be written back explicitly. The input is
                // controlled by `pin`, and the old handler only ever appended,
                // so a backspace produced a shorter value, added nothing, and
                // then React restored the digit from `pin` on re-render — the
                // keypress looked ignored.
                if (digits.length < pin.length) {
                  setPin(digits)
                  setError(false)
                  return
                }
                for (const d of digits.slice(pin.length)) handleDigit(d)
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

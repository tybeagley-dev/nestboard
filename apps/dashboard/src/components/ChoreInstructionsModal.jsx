import { useState, useEffect } from 'react'
import TokenBadge from './TokenBadge'
import { useLabels } from '../FamilyContext'

export default function ChoreInstructionsModal({ chore, onComplete, onClose }) {
  const labels = useLabels()
  const [checked, setChecked] = useState(() =>
    chore.instructions.map(() => false)
  )

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const allChecked = checked.every(Boolean)

  function toggle(i) {
    setChecked(prev => prev.map((v, j) => j === i ? !v : v))
  }

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card instructions-modal">
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>

        <div className="instructions-header">
          <span className="instructions-icon">{chore.icon}</span>
          <div>
            <h2 className="modal-title">{chore.label}</h2>
            <p className="instructions-tokens">
              <TokenBadge amount={chore.tokens} /> {chore.tokens} {chore.tokens !== 1 ? labels.tokenName : labels.tokenNameSingular}
            </p>
          </div>
        </div>

        <ul className="instructions-list">
          {chore.instructions.map((step, i) => (
            <li key={i} className="instructions-step">
              <button
                className={`step-check ${checked[i] ? 'checked' : ''}`}
                onClick={() => toggle(i)}
                aria-pressed={checked[i]}
              >
                {checked[i] && (
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                    <path d="M1 5L4.5 8.5L11 1" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <span className={`step-label ${checked[i] ? 'done' : ''}`}>{step}</span>
            </li>
          ))}
        </ul>

        <div className="instructions-actions">
          <button
            className="btn-complete"
            onClick={onComplete}
            disabled={!allChecked}
          >
            ✓ All done!
          </button>
          <button className="btn-spin-again" onClick={onClose}>
            Not yet
          </button>
        </div>
      </div>
    </div>
  )
}

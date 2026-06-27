import { useState, useEffect, useRef } from 'react'
import { Brush } from 'lucide-react'
import { CONFIG } from '../config/config'

const DURATION_OPTIONS = [5, 10, 15, 20]

export default function TidyTimerButton({ onStart }) {
  const [open, setOpen] = useState(false)
  const [duration, setDuration] = useState(CONFIG.tidyTimer?.defaultMinutes ?? 10)
  const popoverRef = useRef(null)

  // Close popover on outside click
  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function handleStart() {
    setOpen(false)
    onStart(duration)
  }

  return (
    <div className="tidy-btn-wrap" ref={popoverRef}>
      <button
        className="timer-icon-btn"
        onClick={() => setOpen(o => !o)}
        title="Tidy Time"
      >
        <Brush size={18} strokeWidth={1.8} />
      </button>

      {open && (
        <div className="tidy-popover">
          <p className="tidy-popover-label">Tidy Time</p>

          <div className="tidy-duration-row">
            {DURATION_OPTIONS.map(opt => (
              <button
                key={opt}
                className={`tidy-duration-opt ${duration === opt ? 'selected' : ''}`}
                onClick={() => setDuration(opt)}
              >
                {opt}m
              </button>
            ))}
          </div>

          <button className="tidy-start-btn" onClick={handleStart}>
            Start!
          </button>
        </div>
      )}
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'
import { EMOJI_GROUPS } from '../config/emojiOptions'

// Controlled emoji field used by the chore/routine/zone/reward forms (in both
// the parent panel and onboarding). A trigger shows the current emoji; the
// popover offers a curated grid plus a paste-your-own field for anything not
// listed. Replaces the bare "type an emoji" text input.
export default function EmojiPicker({ value, onChange, placeholder = '🙂' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function pick(emoji) {
    onChange(emoji)
    setOpen(false)
  }

  return (
    <div className="emoji-picker" ref={ref}>
      <button type="button" className="emoji-picker-trigger" onClick={() => setOpen(o => !o)}>
        <span className="emoji-picker-current">
          {value || <span className="emoji-picker-placeholder">{placeholder}</span>}
        </span>
        <span className="emoji-picker-caret">▾</span>
      </button>

      {open && (
        <div className="emoji-picker-popover">
          {EMOJI_GROUPS.map(group => (
            <div key={group.label} className="emoji-picker-group">
              <p className="emoji-picker-group-label">{group.label}</p>
              <div className="emoji-picker-grid">
                {group.emoji.map(e => (
                  <button
                    type="button"
                    key={e}
                    className={`emoji-picker-cell ${value === e ? 'selected' : ''}`}
                    onClick={() => pick(e)}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="emoji-picker-custom">
            <input
              className="chore-form-input"
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder="Or paste your own"
            />
            {value && (
              <button type="button" className="emoji-picker-clear" onClick={() => onChange('')}>
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

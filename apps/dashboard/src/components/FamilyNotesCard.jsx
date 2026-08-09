import { useState } from 'react'
import { useAnnouncements } from '../hooks/useAnnouncements'

// Family notes render under the greeting on the dashboard, one at a time,
// rotating when there's more than one (GreetingSection).
//
// The editor used to sit at the bottom of the Meals tab, which is module-gated —
// so a family that turned meal planning off lost the only way to reach it, for a
// feature that isn't part of meals at all.
// Mirrors NOTE_MAX_LENGTH in api/src/routes/announcements.js, which is the one
// that actually enforces it. A note renders on a single line under the greeting.
const NOTE_MAX_LENGTH = 80

export default function FamilyNotesCard() {
  const { announcements, addAnnouncement, removeAnnouncement } = useAnnouncements()
  const [newNote, setNewNote] = useState('')
  const [adding,  setAdding]  = useState(false)

  const remaining = NOTE_MAX_LENGTH - newNote.length

  async function handleAdd() {
    const text = newNote.trim()
    if (!text) return
    setAdding(true)
    await addAnnouncement(text)
    setNewNote('')
    setAdding(false)
  }

  return (
    <div className="family-code-card">
      <div className="family-code-section">
        <span className="chore-form-label">Family notes</span>
        <p className="chore-form-hint">
          Shown under the greeting on the dashboard. Add more than one and they take turns.
        </p>

        <div className="parent-notes-list">
          {announcements.length === 0 && (
            <p className="parent-soon-msg" style={{ padding: '8px 0', textAlign: 'left' }}>
              No notes yet.
            </p>
          )}
          {announcements.map(a => (
            <div key={a.id} className="parent-note-row">
              <span className="parent-note-text">{a.text}</span>
              <button
                className="chore-admin-del-btn"
                onClick={() => removeAnnouncement(a.id)}
                aria-label={`Remove note: ${a.text}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="parent-note-add-row">
          <input
            className="chore-form-input"
            placeholder="Add a family note…"
            value={newNote}
            maxLength={NOTE_MAX_LENGTH}
            onChange={e => setNewNote(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button
            className="parent-apply-btn"
            onClick={handleAdd}
            disabled={adding || !newNote.trim()}
            style={{ flexShrink: 0 }}
          >
            Add
          </button>
        </div>
        {remaining <= 20 && (
          <p className={`note-char-count ${remaining === 0 ? 'at-limit' : ''}`}>
            {remaining} character{remaining === 1 ? '' : 's'} left
          </p>
        )}
      </div>
    </div>
  )
}

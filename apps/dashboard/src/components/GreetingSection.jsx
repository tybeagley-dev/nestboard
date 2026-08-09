import { useState, useEffect } from 'react'
import { formatDate, formatTime, getGreeting } from '../utils/dateUtils'
import { CONFIG } from '../config/config'
import { useFamily, useSettings } from '../FamilyContext'
import { useAnnouncements } from '../hooks/useAnnouncements'

// The line under the greeting is the family's note. It used to be the hardcoded
// string "Do good, be kind, have fun!" — one family's motto shipped to everyone,
// sitting in the slot the notes were meant to occupy. Nothing renders when there
// are no notes; the slot simply collapses.
const ROTATE_MS = 12000

export default function GreetingSection({ now, onGrocery }) {
  const family = useFamily()
  const { modules } = useSettings()
  const { announcements } = useAnnouncements()
  const [index, setIndex] = useState(0)

  // More than one note cycles, so a list of them is actually visible on a board
  // nobody interacts with. Keyed off length so removing a note resets cleanly.
  useEffect(() => {
    if (announcements.length < 2) return setIndex(0)
    const id = setInterval(() => setIndex(i => i + 1), ROTATE_MS)
    return () => clearInterval(id)
  }, [announcements.length])

  const note = announcements.length
    ? announcements[index % announcements.length]
    : null

  return (
    <div className="greeting-section">
      <div className="greeting-body">
        <h1 className="greeting-headline">
          {getGreeting(now)},<br />{family?.name ?? CONFIG.familyName}!
        </h1>
        {note && (
          // key on the note so swapping one for the next replays the fade.
          <p className="greeting-tagline" key={note.id}>{note.text}</p>
        )}
        <div className="greeting-datetime">
          <span className="greeting-time">{formatTime(now)}</span>
          <span className="greeting-date">{formatDate(now)}</span>
        </div>
      </div>
      {modules.grocery && (
        <div className="greeting-pills">
          <button className="greeting-pill grocery-pill" onClick={onGrocery}>
            grocery list
          </button>
        </div>
      )}
    </div>
  )
}

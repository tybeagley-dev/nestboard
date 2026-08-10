import { useState, useEffect } from 'react'
import { formatDate, formatTime, getGreeting } from '../utils/dateUtils'
import { useFamily, useSettings } from '../FamilyContext'
import { useAnnouncements } from '../hooks/useAnnouncements'
import { greetingLine } from '../utils/greeting'

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
  const line = greetingLine(family)

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
        {/* No hardcoded fallback name. Under FamilyGate the family was always
            loaded before this rendered, so the old default was dead code — but
            the kiosk resolves its family asynchronously, which would have
            flashed one family's name on every other family's display. */}
        <h1 className="greeting-headline">
          {line
            ? <>{getGreeting(now)},<br />{line}</>
            : <>{getGreeting(now)}!</>}
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

import { useMemo, useEffect } from 'react'
import { useCalendarEvents } from '../hooks/useCalendarEvents'
import ChildIcon from './ChildIcon'
import { isSameDay } from '../utils/dateUtils'

function addDays(d, n) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function fmtDayLabel(d, today) {
  if (isSameDay(d, today)) return 'Today'
  if (isSameDay(d, addDays(today, 1))) return 'Tomorrow'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

export default function UpcomingModal({ child, onClose }) {
  const events = useCalendarEvents(child.name)
  const today  = new Date()

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const days = useMemo(() => {
    const result = []
    for (let i = 0; i < 7; i++) {
      const day = addDays(today, i)
      const dayEvents = events.filter(e => {
        const [y, m, d] = e.date.split('-').map(Number)
        return isSameDay(new Date(y, m - 1, d), day)
      })
      if (dayEvents.length > 0) result.push({ day, events: dayEvents })
    }
    return result
  }, [events])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card upcoming-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        <div className="modal-child-header">
          <div className="modal-avatar" style={{ background: child.color }}><ChildIcon name={child.icon} size={22} /></div>
          <div>
            <h2 className="modal-title">{child.name}'s Week</h2>
            <p className="modal-points-line">Upcoming events this week</p>
          </div>
        </div>

        {days.length === 0 ? (
          <p className="upcoming-empty">Nothing on {child.name}'s calendar this week</p>
        ) : (
          <div className="upcoming-days">
            {days.map(({ day, events: dayEvents }, i) => (
              <div key={i} className="upcoming-day-group">
                <h3 className="upcoming-day-label">{fmtDayLabel(day, today)}</h3>
                {dayEvents.map((evt, j) => (
                  <div key={j} className="upcoming-event-row">
                    <span className="upcoming-event-bar" style={{ background: evt.color }} />
                    <div className="upcoming-event-info">
                      <span className="upcoming-event-title">{evt.title}</span>
                      {evt.time && (
                        <span className="upcoming-event-time">
                          {evt.time}{evt.endTime && evt.endTime !== evt.time ? ` – ${evt.endTime}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

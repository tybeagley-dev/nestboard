import { useCalendarEvents } from '../hooks/useCalendarEvents'
import { isSameDay, formatDate } from '../utils/dateUtils'

export default function CalendarCard({ now, onExpand }) {
  const events = useCalendarEvents()

  const todaysEvents = events.filter(e => {
    const [y, m, d] = e.date.split('-').map(Number)
    return isSameDay(new Date(y, m - 1, d), now)
  })

  return (
    <button className="info-card calendar-card" onClick={onExpand}>
      <span className="calendar-card-date">{formatDate(now)}</span>
      <span className="info-card-label">Today's Events</span>

      <div className="calendar-card-events">
        {todaysEvents.length === 0 ? (
          <span className="info-card-empty">Nothing scheduled today</span>
        ) : (
          todaysEvents.map((evt, i) => (
            <div key={i} className="calendar-card-event">
              <span
                className="calendar-card-event-dot"
                style={{ background: evt.color ?? 'rgba(255,255,255,0.6)' }}
              />
              <div className="calendar-card-event-info">
                <span className="calendar-card-event-title">{evt.title}</span>
                {evt.time && <span className="calendar-card-event-time">{evt.time}</span>}
              </div>
            </div>
          ))
        )}
      </div>

      <span className="info-card-popout" aria-hidden>↗</span>
    </button>
  )
}

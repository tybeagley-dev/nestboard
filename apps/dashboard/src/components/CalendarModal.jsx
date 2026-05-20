import { useState, useMemo } from 'react'
import { useCalendarEvents, useCalendars } from '../hooks/useCalendarEvents'
import { isSameDay } from '../utils/dateUtils'

function fmtMonthYear(d) {
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function fmtDayFull(d) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

function addDays(d, n) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function getWeekStart(d) {
  const r = new Date(d)
  const day = r.getDay()
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1)) // Mon start
  r.setHours(0, 0, 0, 0)
  return r
}

function getMonthDays(year, month) {
  const first = new Date(year, month, 1)
  const last  = new Date(year, month + 1, 0)
  const days  = []
  const startPad = (first.getDay() + 6) % 7 // Mon=0
  for (let i = 0; i < startPad; i++) days.push(null)
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d))
  return days
}

export default function CalendarModal({ onClose }) {
  const events    = useCalendarEvents()
  const calendars = useCalendars()
  const [view, setView]         = useState('week')
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [monthRef, setMonthRef]   = useState(() => new Date())
  const [hidden, setHidden]       = useState(new Set())

  const visible = useMemo(
    () => events.filter(e => !e.calendarName || !hidden.has(e.calendarName)),
    [events, hidden]
  )

  function toggleCalendar(name) {
    setHidden(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  function eventsOnDay(day) {
    return visible.filter(e => {
      const [y, m, d] = e.date.split('-').map(Number)
      return isSameDay(new Date(y, m - 1, d), day)
    })
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const monthDays = getMonthDays(monthRef.getFullYear(), monthRef.getMonth())

  function prevWeek() { setWeekStart(d => addDays(d, -7)) }
  function nextWeek() { setWeekStart(d => addDays(d, 7))  }
  function prevMonth() { setMonthRef(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)) }
  function nextMonth() { setMonthRef(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)) }

  const today = new Date()

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card cal-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        {/* Header */}
        <div className="cal-modal-header">
          <div className="cal-modal-nav">
            <button className="cal-nav-btn" onClick={view === 'week' ? prevWeek : prevMonth}>‹</button>
            <span className="cal-modal-title">
              {view === 'week'
                ? `${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                : fmtMonthYear(monthRef)
              }
            </span>
            <button className="cal-nav-btn" onClick={view === 'week' ? nextWeek : nextMonth}>›</button>
          </div>
          <div className="cal-view-toggle">
            <button className={`cal-view-btn ${view === 'week' ? 'active' : ''}`} onClick={() => setView('week')}>Week</button>
            <button className={`cal-view-btn ${view === 'month' ? 'active' : ''}`} onClick={() => setView('month')}>Month</button>
          </div>
        </div>

        {/* Calendar filter */}
        {calendars.length > 0 && (
          <div className="cal-filters">
            {calendars.map(cal => (
              <button
                key={cal.name}
                className={`cal-filter-pill ${hidden.has(cal.name) ? 'off' : ''}`}
                style={{ '--cal-color': cal.color }}
                onClick={() => toggleCalendar(cal.name)}
              >
                <span className="cal-filter-dot" />
                {cal.name}
              </button>
            ))}
          </div>
        )}

        {/* Week view */}
        {view === 'week' && (
          <div className="cal-week-grid">
            {weekDays.map((day, i) => {
              const dayEvents = eventsOnDay(day)
              const isToday   = isSameDay(day, today)
              return (
                <div key={i} className={`cal-week-col ${isToday ? 'today' : ''}`}>
                  <div className="cal-week-col-header">
                    <span className="cal-week-day-name">
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span className={`cal-week-day-num ${isToday ? 'today' : ''}`}>
                      {day.getDate()}
                    </span>
                  </div>
                  <div className="cal-week-events">
                    {dayEvents.map((evt, j) => (
                      <div key={j} className="cal-event-item" style={{ '--cal-color': evt.color }}>
                        <span className="cal-event-bar" />
                        <div className="cal-event-text">
                          <span className="cal-event-title">{evt.title}</span>
                          {evt.time && <span className="cal-event-time">{evt.time}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Month view */}
        {view === 'month' && (
          <div className="cal-month-grid">
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
              <div key={d} className="cal-month-day-name">{d}</div>
            ))}
            {monthDays.map((day, i) => {
              if (!day) return <div key={`pad-${i}`} className="cal-month-cell empty" />
              const dayEvents = eventsOnDay(day)
              const isToday   = isSameDay(day, today)
              return (
                <div key={i} className={`cal-month-cell ${isToday ? 'today' : ''}`}>
                  <span className="cal-month-num">{day.getDate()}</span>
                  <div className="cal-month-dots">
                    {dayEvents.slice(0, 3).map((evt, j) => (
                      <span
                        key={j}
                        className="cal-month-event-dot"
                        style={{ background: evt.color }}
                        title={evt.title}
                      />
                    ))}
                  </div>
                  <div className="cal-month-events">
                    {dayEvents.slice(0, 2).map((evt, j) => (
                      <span key={j} className="cal-month-event-label" style={{ '--cal-color': evt.color }}>
                        {evt.title}
                      </span>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="cal-month-event-more">+{dayEvents.length - 2} more</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

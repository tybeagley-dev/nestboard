import { useState, useEffect } from 'react'
import { CONFIG } from '../config/config'
import { apiGet } from '../utils/api'

export function useCalendarEvents(child = null) {
  const [events, setEvents] = useState(child ? [] : (CONFIG.events ?? []))

  useEffect(() => {
    const url = child ? `/calendar/events?child=${encodeURIComponent(child)}` : '/calendar/events'
    apiGet(url).then(data => {
      if (Array.isArray(data) && data.length > 0) setEvents(data)
    })
  }, [child])

  return events
}

export function useCalendars() {
  const [calendars, setCalendars] = useState([])
  useEffect(() => {
    apiGet('/calendar/events').then(data => {
      if (!Array.isArray(data)) return
      const seen = new Set()
      const cals = []
      for (const e of data) {
        if (e.calendarName && !seen.has(e.calendarName)) {
          seen.add(e.calendarName)
          cals.push({ name: e.calendarName, color: e.color, child: e.child })
        }
      }
      setCalendars(cals)
    })
  }, [])
  return calendars
}

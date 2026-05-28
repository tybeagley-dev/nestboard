import { Router } from 'express'
import { db } from '../db/client.js'
import { requireFamily } from '../middleware/requireFamily.js'
import { requireParent } from '../middleware/requireParent.js'
import { resolveChildId } from '../db/resolveChild.js'

const router = Router()

router.use(requireFamily)

// Per-family in-memory cache — Map<familyId, { data, expiresAt }>
const cacheMap = new Map()
const CACHE_TTL_MS = 15 * 60 * 1000

// ── iCal parser ───────────────────────────────────────────────────────────────

function parseIcalDate(str) {
  if (!str) return null
  if (/^\d{8}$/.test(str)) {
    const y = +str.slice(0,4), m = +str.slice(4,6) - 1, d = +str.slice(6,8)
    return { jsDate: new Date(y, m, d, 0, 0, 0), allDay: true }
  }
  if (/^\d{8}T\d{6}Z$/.test(str)) {
    const iso = `${str.slice(0,4)}-${str.slice(4,6)}-${str.slice(6,8)}T${str.slice(9,11)}:${str.slice(11,13)}:${str.slice(13,15)}Z`
    return { jsDate: new Date(iso), allDay: false }
  }
  if (/^\d{8}T\d{6}$/.test(str)) {
    const y = +str.slice(0,4), mo = +str.slice(4,6) - 1, d = +str.slice(6,8)
    const h = +str.slice(9,11), mi = +str.slice(11,13)
    return { jsDate: new Date(y, mo, d, h, mi, 0), allDay: false }
  }
  return null
}

function dayStart(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0)
}

function fmtDate(d) {
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const dy = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dy}`
}

function fmtTimeShort(d) {
  let h    = d.getHours()
  const mi = d.getMinutes()
  const ap = h >= 12 ? 'pm' : 'am'
  h = h % 12 || 12
  return mi === 0 ? `${h}${ap}` : `${h}:${String(mi).padStart(2, '0')}${ap}`
}

function advanceByFreq(d, freq, interval, byDay, originalStart) {
  const next = new Date(d)

  if (freq === 'DAILY') {
    next.setDate(next.getDate() + interval)
    return next
  }

  if (freq === 'WEEKLY') {
    if (byDay && byDay.length > 1) {
      const dayMap = { SU:0, MO:1, TU:2, WE:3, TH:4, FR:5, SA:6 }
      const targetDays = byDay.map(d => dayMap[d.slice(-2)]).sort((a,b) => a - b)
      const cur     = next.getDay()
      const nextDay = targetDays.find(td => td > cur)
      if (nextDay !== undefined) {
        next.setDate(next.getDate() + (nextDay - cur))
      } else {
        next.setDate(next.getDate() + (7 * interval - cur + targetDays[0]))
      }
      return next
    }
    next.setDate(next.getDate() + 7 * interval)
    return next
  }

  if (freq === 'MONTHLY') {
    next.setMonth(next.getMonth() + interval)
    return next
  }

  if (freq === 'YEARLY') {
    next.setFullYear(next.getFullYear() + interval)
    return next
  }

  return null
}

function expandRRule(dtstart, rruleStr, now, cutoff) {
  const parts = {}
  rruleStr.split(';').forEach(p => {
    const [k, v] = p.split('=')
    parts[k] = v
  })

  const freq     = parts['FREQ']
  const interval = parseInt(parts['INTERVAL'] || '1', 10)
  const count    = parts['COUNT'] ? parseInt(parts['COUNT'], 10) : Infinity
  const until    = parts['UNTIL'] ? (parseIcalDate(parts['UNTIL'].replace('Z', '')) || {}).jsDate : null
  const byDay    = parts['BYDAY'] ? parts['BYDAY'].split(',') : null

  const windowEnd    = until && until < cutoff ? until : cutoff
  const occurrences  = []
  let current        = new Date(dtstart.jsDate)
  let n              = 0

  while (current < dayStart(now)) {
    current = advanceByFreq(current, freq, interval, byDay, dtstart.jsDate)
    if (!current) return occurrences
  }

  while (current < windowEnd && n < count) {
    occurrences.push(new Date(current))
    current = advanceByFreq(current, freq, interval, byDay, dtstart.jsDate)
    if (!current) break
    n++
    if (n > 500) break
  }

  return occurrences
}

function expandEvent(props, color, calName, calChild, now, cutoff) {
  const summary    = props['SUMMARY'] || '(No title)'
  const dtstart    = parseIcalDate(props['DTSTART'])
  const dtend      = parseIcalDate(props['DTEND'])
  if (!dtstart) return []

  const durationMs = (dtend && !dtstart.allDay)
    ? dtend.jsDate.getTime() - dtstart.jsDate.getTime()
    : 0

  const base = { color, calendarName: calName, child: calChild ?? null }
  const results = []

  if (props['RRULE']) {
    const occurrences = expandRRule(dtstart, props['RRULE'], now, cutoff)
    for (const d of occurrences) {
      const endDate = durationMs > 0 ? new Date(d.getTime() + durationMs) : null
      results.push({
        ...base,
        date:    fmtDate(d),
        title:   summary,
        time:    dtstart.allDay ? '' : fmtTimeShort(d),
        endTime: endDate ? fmtTimeShort(endDate) : '',
      })
    }
  } else {
    const d = dtstart.jsDate
    if (d >= dayStart(now) && d < cutoff) {
      const endDate = (dtend && !dtstart.allDay) ? dtend.jsDate : null
      results.push({
        ...base,
        date:    fmtDate(d),
        title:   summary,
        time:    dtstart.allDay ? '' : fmtTimeShort(d),
        endTime: endDate ? fmtTimeShort(endDate) : '',
      })
    }
  }

  return results
}

function parseIcal(text, color, calName, calChild, now, cutoff) {
  const unfolded = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '')
  const lines    = unfolded.split(/\r\n|\n/)
  const events   = []
  let inEvent    = false
  let props      = {}

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true
      props   = {}
    } else if (line === 'END:VEVENT') {
      inEvent = false
      events.push(...expandEvent(props, color, calName, calChild, now, cutoff))
    } else if (inEvent) {
      const colon = line.indexOf(':')
      if (colon === -1) continue
      const keyFull = line.slice(0, colon)
      const val     = line.slice(colon + 1)
        .replace(/\\,/g, ',')
        .replace(/\\n/g, ' ')
        .replace(/\\;/g, ';')
        .replace(/\\\\/g, '\\')
      const key  = keyFull.split(';')[0].toUpperCase()
      props[key] = val
    }
  }

  return events
}

async function fetchAndParseCalendars(familyId) {
  const { rows } = await db.query(
    `SELECT c.id, c.name, c.url, c.color, ch.name AS child_name
     FROM calendars c
     LEFT JOIN children ch ON ch.id = c.child_id
     WHERE c.family_id = $1`,
    [familyId]
  )
  const now    = new Date()
  const cutoff = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
  const all    = []

  await Promise.all(rows.map(async cal => {
    try {
      const url = cal.url.replace(/^webcal:\/\//i, 'https://')
      const res = await fetch(url)
      if (!res.ok) return
      const text   = await res.text()
      const events = parseIcal(text, cal.color, cal.name, cal.child_name ?? null, now, cutoff)
      all.push(...events)
    } catch {
      // skip calendars that fail to fetch
    }
  }))

  all.sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
  return all
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /calendar/events?child=Paige
router.get('/events', async (req, res) => {
  const familyId = req.familyId
  let entry = cacheMap.get(familyId)
  if (!entry || entry.expiresAt <= Date.now()) {
    const data = await fetchAndParseCalendars(familyId)
    entry = { data, expiresAt: Date.now() + CACHE_TTL_MS }
    cacheMap.set(familyId, entry)
  }
  const { child } = req.query
  const data = child
    ? entry.data.filter(e => e.child === child || e.child === null)
    : entry.data
  res.json(data)
})

// ── Calendar URL management (parent only) ─────────────────────────────────────

router.get('/', requireParent, async (req, res) => {
  const { rows } = await db.query(
    `SELECT c.id, c.family_id, c.name, c.url, c.color, c.child_id, ch.name AS child
     FROM calendars c
     LEFT JOIN children ch ON ch.id = c.child_id
     WHERE c.family_id = $1
     ORDER BY c.name`,
    [req.familyId]
  )
  res.json(rows)
})

router.post('/', requireParent, async (req, res) => {
  const { name, url, color, child } = req.body
  if (!name || !url) return res.status(400).json({ error: 'Missing params' })
  const childId = child ? await resolveChildId(req.familyId, child) : null
  if (child && !childId) return res.status(400).json({ error: 'Unknown child' })
  const id = Date.now().toString(36)
  await db.query(
    `INSERT INTO calendars (id, family_id, name, url, color, child_id) VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, req.familyId, name, url, color ?? '#C17A4A', childId]
  )
  cacheMap.delete(req.familyId)
  res.json({ success: true, id })
})

router.put('/:id', requireParent, async (req, res) => {
  const { name, url, color, child } = req.body
  const childId = child ? await resolveChildId(req.familyId, child) : null
  if (child && !childId) return res.status(400).json({ error: 'Unknown child' })
  await db.query(
    `UPDATE calendars SET name=$1, url=$2, color=$3, child_id=$4 WHERE id=$5 AND family_id=$6`,
    [name, url, color, childId, req.params.id, req.familyId]
  )
  cacheMap.delete(req.familyId)
  res.json({ success: true })
})

router.delete('/:id', requireParent, async (req, res) => {
  await db.query(
    `DELETE FROM calendars WHERE id=$1 AND family_id=$2`,
    [req.params.id, req.familyId]
  )
  cacheMap.delete(req.familyId)
  res.json({ success: true })
})

export default router

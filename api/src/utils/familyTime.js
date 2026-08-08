import { db } from '../db/client.js'

// "What day is it for this family" — every screen-time ledger date goes through
// here. Postgres CURRENT_DATE is the server's day (UTC on Railway), which rolls
// over at ~5-6pm for US families and puts evening screen time on tomorrow.
const DEFAULT_TZ = 'UTC'

const tzCache      = new Map() // familyId -> IANA tz
const backfillSeen = new Set() // familyId — one geocode attempt per process

export function isValidTz(tz) {
  if (typeof tz !== 'string' || !tz) return false
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

// en-CA formats as YYYY-MM-DD, which is what DATE columns want.
export function localDate(tz, when = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: isValidTz(tz) ? tz : DEFAULT_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(when)
}

// Day math on the string, anchored at UTC noon so a DST shift can't move the date.
export function shiftDate(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

export function tzFromWeather(weather) {
  return isValidTz(weather?.timezone) ? weather.timezone : DEFAULT_TZ
}

// Families who picked a weather location before we started storing the timezone
// have lat/lon but no tz. Resolve it once per process, off the request path —
// this request still uses UTC, the next one gets the real zone.
function backfillTimezone(familyId, weather) {
  if (backfillSeen.has(familyId)) return
  backfillSeen.add(familyId)
  const { lat, lon } = weather ?? {}
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return

  fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&timezone=auto&forecast_days=1`)
    .then(r => r.json())
    .then(async (data) => {
      if (!isValidTz(data?.timezone)) return
      await db.query(
        `UPDATE families SET weather = COALESCE(weather, '{}'::jsonb) || jsonb_build_object('timezone', $1::text)
         WHERE id = $2`,
        [data.timezone, familyId]
      )
      tzCache.set(familyId, data.timezone)
    })
    .catch(err => console.error('Timezone backfill failed:', familyId, err.message))
}

export async function getFamilyTimezone(familyId) {
  if (tzCache.has(familyId)) return tzCache.get(familyId)

  const { rows } = await db.query('SELECT weather FROM families WHERE id = $1', [familyId])
  const weather = rows[0]?.weather
  if (isValidTz(weather?.timezone)) {
    tzCache.set(familyId, weather.timezone)
    return weather.timezone
  }

  backfillTimezone(familyId, weather)
  return DEFAULT_TZ
}

// Called when a family changes its weather location so the cache doesn't go stale.
export function invalidateFamilyTimezone(familyId) {
  tzCache.delete(familyId)
  backfillSeen.delete(familyId)
}

export async function familyToday(familyId) {
  return localDate(await getFamilyTimezone(familyId))
}

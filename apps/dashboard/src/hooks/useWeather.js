import { useState, useEffect } from 'react'
import { useFamily } from '../FamilyContext'

const REFRESH_MS = 30 * 60 * 1000 // 30 minutes

const CURRENT_VARS = 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m,precipitation,is_day'
const DAILY_VARS   = 'temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunrise,sunset'
const HOURLY_VARS  = 'temperature_2m,precipitation_probability,weather_code,is_day'

function parseTime(iso) {
  // "2026-05-08T06:23" → "6:23 AM"
  const [, time] = iso.split('T')
  const [h, m]   = time.split(':').map(Number)
  const ampm     = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

function windDir(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW']
  return dirs[Math.round(deg / 45) % 8]
}

export function useWeather() {
  const [weather, setWeather] = useState(null)
  // Coords come from the family row the tree already holds. Fetching
  // /auth/family here again cost a round trip before the forecast could even
  // start, and left the card absent long enough for the meal card beside it to
  // claim the whole column and then shrink.
  const family = useFamily()
  const { lat, lon, label } = family?.weather ?? {}
  const hasLocation = typeof lat === 'number'

  useEffect(() => {
    let cancelled = false
    let intervalId

    async function fetch_() {
      try {
        const url = [
          `https://api.open-meteo.com/v1/forecast`,
          `?latitude=${lat}&longitude=${lon}`,
          `&current=${CURRENT_VARS}`,
          `&daily=${DAILY_VARS}`,
          `&hourly=${HOURLY_VARS}`,
          `&temperature_unit=fahrenheit`,
          `&wind_speed_unit=mph`,
          `&precipitation_unit=inch`,
          `&forecast_days=7`,
          `&timezone=auto`,
        ].join('')

        const res  = await fetch(url)
        const data = await res.json()
        const c    = data.current
        const d    = data.daily
        const h    = data.hourly

        // Build 7-day daily forecast
        const daily = d.time.map((date, i) => ({
          date,
          high:       Math.round(d.temperature_2m_max[i]),
          low:        Math.round(d.temperature_2m_min[i]),
          code:       d.weather_code[i],
          precip:     Math.round(d.precipitation_sum[i] * 100) / 100,
          precipProb: d.precipitation_probability_max[i],
          windMax:    Math.round(d.wind_speed_10m_max[i]),
          uvIndex:    Math.round(d.uv_index_max[i] ?? 0),
          sunrise:    parseTime(d.sunrise[i]),
          sunset:     parseTime(d.sunset[i]),
        }))

        // Build hourly for today: next 24 hours from current hour
        const nowIso     = data.current.time  // e.g. "2026-05-08T14:00"
        const nowIdx     = h.time.indexOf(nowIso)
        const startIdx   = nowIdx >= 0 ? nowIdx : 0
        const hourly     = h.time.slice(startIdx, startIdx + 24).map((t, i) => {
          const idx = startIdx + i
          return {
            time:      parseTime(t),
            temp:      Math.round(h.temperature_2m[idx]),
            precipProb: h.precipitation_probability[idx],
            code:      h.weather_code[idx],
            isDay:     h.is_day[idx] === 1,
          }
        })

        if (cancelled) return
        setWeather({
          label,
          // Current conditions (used by header pill)
          temp:      Math.round(c.temperature_2m),
          code:      c.weather_code,
          humidity:  c.relative_humidity_2m,
          wind:      Math.round(c.wind_speed_10m),
          // Extended data (used by modal)
          feelsLike: Math.round(c.apparent_temperature),
          windDir:   windDir(c.wind_direction_10m),
          precip:    c.precipitation,
          isDay:     c.is_day === 1,
          daily,
          hourly,
        })
      } catch {
        // silently fail — weather is non-critical
      }
    }

    // No location set → no fetch, weather stays null and the card stays hidden.
    if (hasLocation) {
      fetch_()
      intervalId = setInterval(fetch_, REFRESH_MS)
    }

    return () => { cancelled = true; if (intervalId) clearInterval(intervalId) }
  }, [hasLocation, lat, lon, label])

  return weather
}

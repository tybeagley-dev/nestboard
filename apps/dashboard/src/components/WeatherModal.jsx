import { useEffect } from 'react'
import { getWeatherInfo } from '../utils/weatherCodes'

const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function uvLabel(uv) {
  if (uv <= 2)  return { label: 'Low',       color: '#6B8F71' }
  if (uv <= 5)  return { label: 'Moderate',  color: '#C4A35A' }
  if (uv <= 7)  return { label: 'High',      color: '#C17A4A' }
  if (uv <= 10) return { label: 'Very High', color: '#c0392b' }
  return              { label: 'Extreme',    color: '#7b2d8b' }
}

export default function WeatherModal({ weather, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const today   = weather.daily?.[0]
  const info    = getWeatherInfo(weather.code)
  const uv      = today ? uvLabel(today.uvIndex) : null

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card weather-modal">
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>

        <div className="wm-location">{weather.label}</div>

        {/* ── Current conditions ── */}
        <div className="wm-current">
          <div className="wm-current-main">
            <span className="wm-emoji">{info.emoji}</span>
            <span className="wm-temp-big">{weather.temp}°</span>
          </div>
          <div className="wm-current-label">{info.label}</div>
          <div className="wm-current-stats">
            <span>Feels like {weather.feelsLike}°</span>
            <span className="wm-dot">·</span>
            <span>Humidity {weather.humidity}%</span>
            <span className="wm-dot">·</span>
            <span>Wind {weather.wind} mph {weather.windDir}</span>
          </div>
          {today && (
            <div className="wm-current-stats">
              <span>H: {today.high}°  L: {today.low}°</span>
              <span className="wm-dot">·</span>
              <span>🌅 {today.sunrise}</span>
              <span className="wm-dot">·</span>
              <span>🌇 {today.sunset}</span>
              {today.uvIndex > 0 && (
                <>
                  <span className="wm-dot">·</span>
                  <span style={{ color: uv.color }}>UV {today.uvIndex} · {uv.label}</span>
                </>
              )}
              {today.precipProb > 0 && (
                <>
                  <span className="wm-dot">·</span>
                  <span>💧 {today.precipProb}% chance · {today.precip}" today</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="wm-body">
          {/* ── Hourly forecast — next 8 hours ── */}
          {weather.hourly?.length > 0 && (
            <div className="wm-section">
              <h3 className="wm-section-title">Next 8 Hours</h3>
              <div className="wm-hourly-grid">
                {weather.hourly.slice(0, 8).map((h, i) => {
                  const hi = getWeatherInfo(h.code)
                  return (
                    <div key={i} className="wm-hour">
                      <span className="wm-hour-time">{h.time}</span>
                      <span className="wm-hour-emoji">{hi.emoji}</span>
                      <span className="wm-hour-temp">{h.temp}°</span>
                      {h.precipProb > 0 && (
                        <span className="wm-hour-precip">💧{h.precipProb}%</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── 7-day forecast ── */}
          {weather.daily?.length > 0 && (
            <div className="wm-section">
              <h3 className="wm-section-title">7-Day Forecast</h3>
              <div className="wm-daily">
                {weather.daily.map((day, i) => {
                  const di   = getWeatherInfo(day.code)
                  const date = new Date(day.date + 'T12:00:00')
                  const name = i === 0 ? 'Today' : DAY_NAMES[date.getDay()]
                  const uvD  = uvLabel(day.uvIndex)
                  return (
                    <div key={i} className="wm-day-row">
                      <span className="wm-day-name">{name}</span>
                      <span className="wm-day-emoji">{di.emoji}</span>
                      <span className="wm-day-hi-lo">
                        <span className="wm-hi">{day.high}°</span>
                        <span className="wm-lo">{day.low}°</span>
                      </span>
                      <span className="wm-day-extras">
                        {day.precipProb > 0 && <span>💧{day.precipProb}%</span>}
                        {day.windMax > 0    && <span>💨{day.windMax} mph</span>}
                        {day.uvIndex > 0    && <span style={{ color: uvD.color }}>UV {day.uvIndex} · {uvD.label}</span>}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

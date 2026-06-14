import { useEffect, useState } from 'react'
import { formatDate, formatTime, getGreeting } from '../utils/dateUtils'
import { getWeatherInfo } from '../utils/weatherCodes'
import { CONFIG } from '../config/config'
import { useFamily } from '../FamilyContext'
import TidyTimerButton from './TidyTimerButton'
import TidyTimerPill from './TidyTimerPill'
import WeatherModal from './WeatherModal'
import { useTidyTimer } from '../hooks/useTidyTimer'
import { useToothbrushTimer } from '../hooks/useToothbrushTimer'
import { startChimeLoop, stopChimeLoop } from '../utils/chime'

export default function Header({ now, weather, onParentOpen }) {
  const family = useFamily()
  const weatherInfo = weather ? getWeatherInfo(weather.code) : null
  const tidy  = useTidyTimer()
  const tooth = useToothbrushTimer()
  const [showWeather, setShowWeather] = useState(false)

  useEffect(() => {
    if (tooth.expired) startChimeLoop()
    else stopChimeLoop()
    return stopChimeLoop
  }, [tooth.expired])

  const toothTimeStr = `${tooth.minutes}:${String(tooth.seconds).padStart(2, '0')}`

  return (
    <>
    <header className="dashboard-header">
      <div className="header-greeting">
        <span className="greeting-text">{getGreeting(now)}, {family?.name ?? CONFIG.familyName}!</span>
      </div>

      <div className="header-center">
        <span className="header-date">{formatDate(now)}</span>
        <span className="header-time">{formatTime(now)}</span>
      </div>

      <div className="header-right">
        {/* Toothbrush timer */}
        {tooth.active ? (
          <div className={`tidy-pill tooth-pill ${tooth.expired ? 'expired' : ''}`}>
            <span className="tidy-pill-icon">🪥</span>
            <span className="tidy-pill-time">
              {tooth.expired ? 'Brush done!' : `Brush · ${toothTimeStr}`}
            </span>
            <button
              className="tidy-pill-stop"
              onClick={() => { stopChimeLoop(); tooth.stopTimer() }}
              aria-label="Stop toothbrush timer"
            >
              ×
            </button>
          </div>
        ) : (
          <button className="tooth-btn" onClick={tooth.startTimer} title="2-min toothbrush timer">
            🪥
          </button>
        )}

        {/* Active family tidy timer pill */}
        {tidy.active && (
          <TidyTimerPill
            minutes={tidy.minutes}
            seconds={tidy.seconds}
            expired={tidy.expired}
            onStop={tidy.stopTimer}
          />
        )}

        {/* Tidy timer trigger button */}
        {!tidy.active && (
          <TidyTimerButton onStart={(mins, castSession) => tidy.startTimer(mins, castSession)} />
        )}

        {/* Parent panel trigger */}
        <button className="parent-open-btn" onClick={onParentOpen} title="Parent Panel" aria-label="Parent Panel">
          ⚙️
        </button>

        {/* Weather pill */}
        <button
          className="header-weather"
          onClick={() => weather && setShowWeather(true)}
          style={{ cursor: weather ? 'pointer' : 'default' }}
        >
          {weatherInfo ? (
            <>
              <span className="weather-emoji">{weatherInfo.emoji}</span>
              <span className="weather-temp">{weather.temp}°</span>
              <span className="weather-label">{weatherInfo.label}</span>
            </>
          ) : (
            <span className="weather-loading">—</span>
          )}
        </button>
      </div>
    </header>

    {showWeather && weather && (
      <WeatherModal weather={weather} onClose={() => setShowWeather(false)} />
    )}
    </>
  )
}

import { useEffect } from 'react'
import TidyTimerButton from './TidyTimerButton'
import TidyTimerPill from './TidyTimerPill'
import WeatherModal from './WeatherModal'
import { useTidyTimer } from '../hooks/useTidyTimer'
import { useToothbrushTimer } from '../hooks/useToothbrushTimer'
import { startChimeLoop, stopChimeLoop } from '../utils/chime'
import { useState } from 'react'
import { getWeatherInfo } from '../utils/weatherCodes'

export default function FloatingControls({ weather, onParentOpen }) {
  const tidy  = useTidyTimer()
  const tooth = useToothbrushTimer()
  const [showWeather, setShowWeather] = useState(false)
  const weatherInfo = weather ? getWeatherInfo(weather.code) : null

  useEffect(() => {
    if (tooth.expired) startChimeLoop()
    else stopChimeLoop()
    return stopChimeLoop
  }, [tooth.expired])

  const toothTimeStr = `${tooth.minutes}:${String(tooth.seconds).padStart(2, '0')}`

  return (
    <>
      <div className="floating-controls">
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
            >×</button>
          </div>
        ) : (
          <button className="floating-icon-btn" onClick={tooth.startTimer} title="2-min toothbrush timer">
            🪥
          </button>
        )}

        {tidy.active ? (
          <TidyTimerPill
            minutes={tidy.minutes}
            seconds={tidy.seconds}
            expired={tidy.expired}
            onStop={tidy.stopTimer}
          />
        ) : (
          <TidyTimerButton onStart={(mins, castSession) => tidy.startTimer(mins, castSession)} />
        )}

        {weatherInfo && (
          <button
            className="floating-icon-btn floating-weather-btn"
            onClick={() => setShowWeather(true)}
            title={`${weather.temp}° · ${weatherInfo.label}`}
          >
            <span>{weatherInfo.emoji}</span>
            <span className="floating-weather-temp">{weather.temp}°</span>
          </button>
        )}

        <button className="floating-icon-btn" onClick={onParentOpen} title="Parent Panel" aria-label="Parent Panel">
          ⚙️
        </button>
      </div>

      {showWeather && weather && (
        <WeatherModal weather={weather} onClose={() => setShowWeather(false)} />
      )}
    </>
  )
}

import { useState } from 'react'
import { getWeatherInfo } from '../utils/weatherCodes'
import WeatherModal from './WeatherModal'
import { CONFIG } from '../config/config'

export default function WeatherCard({ weather }) {
  const [showModal, setShowModal] = useState(false)
  const weatherInfo = weather ? getWeatherInfo(weather.code) : null

  return (
    <>
      <button
        className="info-card weather-card"
        onClick={() => weather && setShowModal(true)}
        style={{ cursor: weather ? 'pointer' : 'default' }}
      >
        <span className="info-card-label">Weather Today</span>
        {weatherInfo ? (
          <div className="weather-card-content">
            <span className="weather-card-emoji">{weatherInfo.emoji}</span>
            <div className="weather-card-right">
              <span className="weather-card-temp">{weather.temp} degrees</span>
              <span className="weather-card-label">{weatherInfo.label}</span>
              <span className="weather-card-city">{CONFIG.weather.label}</span>
            </div>
          </div>
        ) : (
          <span className="info-card-empty">Loading…</span>
        )}
        <span className="info-card-popout" aria-hidden>↗</span>
      </button>

      {showModal && weather && (
        <WeatherModal weather={weather} onClose={() => setShowModal(false)} />
      )}
    </>
  )
}

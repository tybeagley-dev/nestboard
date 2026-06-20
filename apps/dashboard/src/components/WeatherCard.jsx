import { useState } from 'react'
import { getWeatherInfo } from '../utils/weatherCodes'
import WeatherModal from './WeatherModal'

export default function WeatherCard({ weather }) {
  const [showModal, setShowModal] = useState(false)
  // No weather (family hasn't set a location, or still loading) → render nothing.
  if (!weather) return null
  const weatherInfo = getWeatherInfo(weather.code)

  return (
    <>
      <button className="info-card weather-card" onClick={() => setShowModal(true)}>
        <span className="info-card-label">Weather Today</span>
        <div className="weather-card-content">
          <span className="weather-card-emoji">{weatherInfo.emoji}</span>
          <div className="weather-card-right">
            <span className="weather-card-temp">{weather.temp} degrees</span>
            <span className="weather-card-label">{weatherInfo.label}</span>
            <span className="weather-card-city">{weather.label}</span>
          </div>
        </div>
        <span className="info-card-popout" aria-hidden>↗</span>
      </button>

      {showModal && (
        <WeatherModal weather={weather} onClose={() => setShowModal(false)} />
      )}
    </>
  )
}

import { useState } from 'react'
import { getWeatherInfo } from '../utils/weatherCodes'
import { useFamily } from '../FamilyContext'
import WeatherModal from './WeatherModal'

export default function WeatherCard({ weather }) {
  const family = useFamily()
  const [showModal, setShowModal] = useState(false)

  // Two different reasons for having no weather, and they want opposite layouts.
  // No location configured is the steady state — render nothing and let the meal
  // card have the column. A configured location whose forecast hasn't landed yet
  // is temporary, so hold the space: both cards are `flex: 1` in a stretched
  // grid cell, and an absent card means the meal card takes the full height and
  // then visibly halves when the forecast arrives.
  if (!weather) {
    if (typeof family?.weather?.lat !== 'number') return null
    return <div className="info-card weather-card weather-card--pending" aria-hidden="true" />
  }
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

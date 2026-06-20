import { useFamily } from '../FamilyContext'
import WeatherLocationPicker from '../components/WeatherLocationPicker'

// Sets the family's forecast location. Skippable — no location just hides the
// weather pill until they set one in Settings.
export default function StepWeather() {
  const family = useFamily()
  return (
    <div className="onboarding-weather">
      <p className="onboarding-help">
        Show a local forecast on the dashboard. Search your city below — you can change it anytime in Settings.
      </p>
      <WeatherLocationPicker current={family?.weather ?? null} />
    </div>
  )
}

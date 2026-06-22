import { formatDate, formatTime, getGreeting } from '../utils/dateUtils'
import { CONFIG } from '../config/config'
import { useFamily, useSettings } from '../FamilyContext'

export default function GreetingSection({ now, onGrocery }) {
  const family = useFamily()
  const { modules } = useSettings()
  return (
    <div className="greeting-section">
      <div className="greeting-body">
        <h1 className="greeting-headline">
          {getGreeting(now)},<br />{family?.name ?? CONFIG.familyName}!
        </h1>
        <p className="greeting-tagline">Do good, be kind, have fun!</p>
        <div className="greeting-datetime">
          <span className="greeting-time">{formatTime(now)}</span>
          <span className="greeting-date">{formatDate(now)}</span>
        </div>
      </div>
      {modules.grocery && (
        <div className="greeting-pills">
          <button className="greeting-pill grocery-pill" onClick={onGrocery}>
            grocery list
          </button>
        </div>
      )}
    </div>
  )
}

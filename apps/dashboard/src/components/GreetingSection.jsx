import { formatDate, formatTime, getGreeting } from '../utils/dateUtils'
import { CONFIG } from '../config/config'
import { useFamily } from '../FamilyContext'

export default function GreetingSection({ now, onGrocery }) {
  const family = useFamily()
  return (
    <div className="greeting-section">
      <div className="greeting-body">
        <p className="greeting-tagline">Do good, be kind, have fun!</p>
        <h1 className="greeting-headline">
          {getGreeting(now)},<br />{family?.name ?? CONFIG.familyName}!
        </h1>
        <div className="greeting-datetime">
          <span className="greeting-time">{formatTime(now)}</span>
          <span className="greeting-date">{formatDate(now)}</span>
        </div>
      </div>
      <div className="greeting-pills">
        <button className="greeting-pill grocery-pill" onClick={onGrocery}>
          grocery list
        </button>
        <button className="greeting-pill token-pill">
          token trading
        </button>
      </div>
    </div>
  )
}

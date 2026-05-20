import { formatDate, formatTime, getGreeting } from '../utils/dateUtils'
import { CONFIG } from '../config/config'

export default function GreetingSection({ now, onGrocery, onParentOpen }) {
  return (
    <div className="greeting-section">
      <div className="greeting-body">
        <p className="greeting-tagline">Do good, be kind, have fun!</p>
        <h1 className="greeting-headline">
          {getGreeting(now)},<br />{CONFIG.familyName}!
        </h1>
        <div className="greeting-datetime">
          <span className="greeting-time">{formatTime(now)}</span>
          <span className="greeting-date">{formatDate(now)}</span>
        </div>
      </div>
      <div className="greeting-pills">
        <button className="greeting-pill" onClick={onGrocery}>
          grocery list
        </button>
        <button className="greeting-pill" onClick={onParentOpen}>
          token trading
        </button>
      </div>
    </div>
  )
}

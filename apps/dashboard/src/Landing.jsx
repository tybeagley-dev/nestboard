import { Link } from 'react-router-dom'

const FEATURES = [
  'Chores & rewards',
  'Daily routines',
  'Screen time',
  'Meals & calendar',
]

export default function Landing() {
  return (
    <div className="landing">
      <main className="landing-hero">
        <img src="/logo.png" alt="" className="landing-logo" />
        <h1 className="landing-wordmark">nestboard</h1>
        <p className="landing-tagline">The calm command center for family life.</p>
        <p className="landing-lede">
          Chores, routines, rewards, and screen time on one shared screen the
          whole family actually uses.
        </p>

        <ul className="landing-features">
          {FEATURES.map(f => (
            <li key={f} className="landing-feature">{f}</li>
          ))}
        </ul>

        <div className="landing-cta">
          <Link to="/sign-up" className="landing-btn landing-btn-primary">
            Get started
          </Link>
          <Link to="/sign-in" className="landing-btn landing-btn-ghost">
            Sign in
          </Link>
        </div>
      </main>

      <footer className="landing-footer">
        <Link to="/privacy">Privacy</Link>
        <span aria-hidden="true">·</span>
        <Link to="/terms">Terms</Link>
      </footer>
    </div>
  )
}

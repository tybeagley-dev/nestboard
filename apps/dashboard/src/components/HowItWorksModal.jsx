import { useEffect } from 'react'
import { CheckCircle, Coins, Monitor, Timer, ShoppingCart, CalendarDays } from 'lucide-react'
import { useLabels, useSettings } from '../FamilyContext'

// Draft copy — tune the voice later. Covers the *interactive* dashboard surfaces
// that don't fit the parent onboarding wizard (timers, grocery, checking off,
// spinner, tokens, screen time, upcoming). Lives on the kiosk because that's the
// view the kids actually use.
function Section({ icon, title, children }) {
  return (
    <div className="howto-section">
      <div className="howto-section-icon">{icon}</div>
      <div className="howto-section-body">
        <h3 className="howto-section-title">{title}</h3>
        <p className="onboarding-guide-text">{children}</p>
      </div>
    </div>
  )
}

export default function HowItWorksModal({ onClose }) {
  const labels = useLabels()
  const { modules } = useSettings()
  const tokens = labels.tokenName.toLowerCase()

  // "Finishing chores is how they earn ___" — only name the rewards in play.
  const earns = [modules.tokens && tokens, modules.screenTime && 'screen time'].filter(Boolean)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card howto-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        <div className="howto-header">
          <h2 className="modal-title">How the dashboard works</h2>
          <p className="modal-points-line">The tap-to-use bits that aren't in setup. Anyone can open this again from the <strong>?</strong> up top.</p>
        </div>

        <div className="howto-sections">
          <Section icon={<CheckCircle size={20} strokeWidth={1.8} />} title="Checking things off">
            Each kid's card lists their routines and chores for the day. Tap a row to check it
            off — the progress bar fills as they go.
            {modules.zones && <> The weekly <strong>zone</strong> gets a light check-in morning, midday, and evening.</>}
          </Section>

          <Section icon={<span className="howto-emoji">🎡</span>} title="Chore spinner">
            Tap <strong>chore spinner</strong> on a kid's card to spin for a chore from the pool.
            {earns.length > 0 && ` Finishing chores is how they earn ${earns.join(' and ')}.`}
          </Section>

          {modules.tokens && (
            <Section icon={<Coins size={20} strokeWidth={1.8} />} title={labels.tokenName}>
              The coins button on each card shows that kid's {tokens} balance. Tap it to open the
              {' '}{labels.rewardsName.toLowerCase()} and trade {tokens} for rewards.
            </Section>
          )}

          {modules.screenTime && (
            <Section icon={<Monitor size={20} strokeWidth={1.8} />} title="Screen time">
              The screen button shows earned minutes. Kids trade {tokens} for screen time (a parent
              approves the request), then start a timer when they sit down.
            </Section>
          )}

          <Section icon={<Timer size={20} strokeWidth={1.8} />} title="Timers">
            Up top: a 2-minute <strong>toothbrush</strong> timer, a <strong>reading</strong> timer,
            and a whole-family <strong>tidy</strong> timer for quick clean-ups.
            {modules.screenTime && (
              <> There's also a <strong>screen-time timer</strong>: once a kid trades for screen
              time, tapping the screen button starts a countdown of their earned minutes — plus a
              couple extra to get the device set up — and when it hits zero, time's up.</>
            )}
          </Section>

          {modules.grocery && (
            <Section icon={<ShoppingCart size={20} strokeWidth={1.8} />} title="Grocery list">
              Tap the <strong>grocery list</strong> pill by the greeting to add anything the family
              is out of — it shows up for whoever does the shopping.
            </Section>
          )}

          <Section icon={<CalendarDays size={20} strokeWidth={1.8} />} title="What's coming up">
            Tap <strong>upcoming</strong> on a kid's card for their next 7 days, or tap the
            {' '}<strong>Today's Events</strong> card to see the whole family's day, week, or month.
          </Section>
        </div>
      </div>
    </div>
  )
}

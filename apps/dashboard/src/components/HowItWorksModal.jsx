import { useEffect } from 'react'
import { CheckCircle, Coins, Monitor, Timer, ShoppingCart, CalendarDays, BadgeCheck } from 'lucide-react'
import { useLabels, useSettings } from '../FamilyContext'

// Draft copy — tune the voice later. Covers the *interactive* dashboard surfaces
// that don't fit the parent onboarding wizard (timers, grocery, checking off,
// spinner, tokens, screen time, upcoming). Lives on the kiosk because that's the
// view the children actually use.
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
  const { modules, screenTime } = useSettings()
  const tokens = labels.tokenName.toLowerCase()

  // "Finishing chores is how they earn ___" — only name the rewards in play.
  const earns = [modules.tokens && tokens, modules.screenTime && 'screen time'].filter(Boolean)

  // What actually flows through the Approvals queue, by enabled module.
  // Reward-store buys are NOT in this list: `requires_approval` only tells the child
  // to go ask a parent, it never creates an Approvals request.
  const approvalKinds = [
    'chore',
    modules.screenTime && 'screen-time',
    modules.screenTime && modules.tokens && 'screen-free day',
  ].filter(Boolean)

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
          <p className="modal-points-line">
            The tap-to-use bits that aren't in setup. Anyone can open this again from the
            {' '}<strong>?</strong> up top. Everything here is shared — check something off on one
            device and it updates on every screen your family uses.
          </p>
        </div>

        <div className="howto-sections">
          <Section icon={<CheckCircle size={20} strokeWidth={1.8} />} title="Checking things off">
            Each child's card lists their routines and chores for the day. Tap a row to check it
            off — the progress bar fills as they go.
            {modules.zones && <> The weekly <strong>zone</strong> gets a light check-in morning, midday, and evening.</>}
          </Section>

          <Section icon={<span className="howto-emoji">🎡</span>} title="Chore spinner">
            Tap <strong>chore spinner</strong> on a child's card and spin the wheel. Sometimes you
            land on one bigger chore, sometimes two smaller ones — about the same amount of work
            either way.{earns.length > 0 && ` Finishing them is how they earn ${earns.join(' and ')}.`}
            {' '}Don't love your spin? Tap <strong>Spin Again</strong> and keep whichever you prefer.
            After you pick, there's a short <strong>cooldown</strong> before a chore can be checked
            off — that's your cue to go actually do it. Finish your chores and you get one
            {' '}<strong>bonus spin</strong> for a little extra.
          </Section>

          {modules.tokens && (
            <Section icon={<Coins size={20} strokeWidth={1.8} />} title={labels.tokenName}>
              The coins button on each card shows that child's {tokens} balance, what they've
              recently earned and spent, and the {labels.rewardsName.toLowerCase()} to spend it in.
              Some rewards are bought outright; others say <em>ask a grown up</em> first.
              {' '}Once bought, a reward moves to the <strong>Wallet</strong> — it's paid for, but
              you haven't had it yet. Show a parent to cash one in and they'll mark it redeemed.
            </Section>
          )}

          {modules.screenTime && (
            <Section icon={<Monitor size={20} strokeWidth={1.8} />} title="Screen time">
              The screen button shows earned minutes. Children trade {tokens} for screen time (a parent
              approves the request), then start a timer when they sit down.
              {modules.tokens && screenTime.abstinenceEnabled && (
                <> Go a whole day without using any screen time and you can earn{' '}
                <strong>{screenTime.abstinenceTokens} bonus {tokens}</strong> — it shows up for a
                parent to confirm the next morning.</>
              )}
            </Section>
          )}

          <Section icon={<BadgeCheck size={20} strokeWidth={1.8} />} title="Parent approvals">
            Checking off a chore doesn't finish it right away — it goes to a parent to approve
            first, and shows as <strong>pending</strong> until they do. Parents handle these in the
            Parent panel under <strong>Approvals</strong>, where {approvalKinds.join(', ')} requests
            all land.
          </Section>

          <Section icon={<Timer size={20} strokeWidth={1.8} />} title="Timers">
            Up top: a 2-minute <strong>toothbrush</strong> timer, a <strong>reading</strong> timer,
            and a whole-family <strong>tidy</strong> timer for quick clean-ups.
            {modules.screenTime && (
              <> There's also a <strong>screen-time timer</strong>: once a child trades for screen
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
            Tap <strong>upcoming</strong> on a child's card for their next 7 days, or tap the
            {' '}<strong>Today's Events</strong> card to see the whole family's day, week, or month.
          </Section>
        </div>
      </div>
    </div>
  )
}

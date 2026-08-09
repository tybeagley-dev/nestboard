import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, HelpCircle, Smartphone, Sparkles } from 'lucide-react'
import TidyTimerButton from './TidyTimerButton'
import TidyTimerPill from './TidyTimerPill'
import ReadingTimerButton from './ReadingTimerButton'
import HowItWorksModal from './HowItWorksModal'
import DeviceSetupModal from './DeviceSetupModal'
import WhatsNewModal from './WhatsNewModal'
import { hasUnreadRelease } from '../utils/releases'
import { useTidyTimer } from '../hooks/useTidyTimer'
import { useToothbrushTimer } from '../hooks/useToothbrushTimer'
import { useReadingTimer } from '../hooks/useReadingTimer'
import { startChimeLoop, stopChimeLoop } from '../utils/chime'

// Per-device (kiosk), not per-family: auto-open the guide once on the first
// session after onboarding, then leave it to the '?' button.
const HOWTO_SEEN_KEY = 'nestboard_howto_seen'

function ToothbrushIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="21" x2="14" y2="8" />
      <rect x="11" y="3" width="9" height="5" rx="2" />
      <line x1="13" y1="3" x2="13" y2="1.5" strokeWidth="1.3" />
      <line x1="15.5" y1="3" x2="15.5" y2="1.5" strokeWidth="1.3" />
      <line x1="18" y1="3" x2="18" y2="1.5" strokeWidth="1.3" />
    </svg>
  )
}

export default function FloatingControls({ kiosk = false }) {
  const navigate = useNavigate()
  const tidy     = useTidyTimer()
  const tooth    = useToothbrushTimer()
  const reading  = useReadingTimer()
  const [showHowto, setShowHowto] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [showNews,  setShowNews]  = useState(false)
  const [unread,    setUnread]    = useState(() => hasUnreadRelease())

  useEffect(() => {
    if (!localStorage.getItem(HOWTO_SEEN_KEY)) {
      setShowHowto(true)
      localStorage.setItem(HOWTO_SEEN_KEY, '1')
    }
  }, [])

  useEffect(() => {
    if (tooth.expired) startChimeLoop()
    else stopChimeLoop()
    return stopChimeLoop
  }, [tooth.expired])

  useEffect(() => {
    if (reading.expired) startChimeLoop()
  }, [reading.expired])

  const toothTimeStr   = `${tooth.minutes}:${String(tooth.seconds).padStart(2, '0')}`
  const readingTimeStr = `${reading.minutes}:${String(reading.seconds).padStart(2, '0')}`

  return (
    <div className="timer-bar">
      <div className="ribbon-card">
      <span className="timer-bar-label">Timers</span>

      {/* Toothbrush timer */}
      {tooth.active ? (
        <div className={`tidy-pill tooth-pill ${tooth.expired ? 'expired' : ''}`}>
          <ToothbrushIcon size={14} />
          <span className="tidy-pill-time">
            {tooth.expired ? 'Brush done!' : `Brush · ${toothTimeStr}`}
          </span>
          <button
            className="tidy-pill-stop"
            onClick={() => { stopChimeLoop(); tooth.stopTimer() }}
            aria-label="Stop toothbrush timer"
          >×</button>
        </div>
      ) : (
        <button className="timer-icon-btn" onClick={tooth.startTimer} title="2-min toothbrush timer">
          <ToothbrushIcon size={18} />
        </button>
      )}

      {/* Reading timer */}
      {reading.active ? (
        <div className={`tidy-pill ${reading.expired ? 'expired' : ''}`}>
          <span className="tidy-pill-time">
            {reading.expired ? 'Reading done!' : `Read · ${readingTimeStr}`}
          </span>
          <button
            className="tidy-pill-stop"
            onClick={() => { stopChimeLoop(); reading.stopTimer() }}
            aria-label="Stop reading timer"
          >×</button>
        </div>
      ) : (
        <ReadingTimerButton onStart={reading.startTimer} />
      )}

      {/* Tidy timer */}
      {tidy.active ? (
        <TidyTimerPill
          minutes={tidy.minutes}
          seconds={tidy.seconds}
          expired={tidy.expired}
          onStop={tidy.stopTimer}
        />
      ) : (
        <TidyTimerButton onStart={mins => tidy.startTimer(mins)} />
      )}
      </div>

      <div className="ribbon-actions">
        <button
          className="timer-icon-btn whats-new-btn"
          onClick={() => { setShowNews(true); setUnread(false) }}
          title={unread ? "What's new — unread" : "What's new"}
          aria-label={unread ? "What's new, unread" : "What's new"}
        >
          <Sparkles size={18} strokeWidth={1.8} />
          {unread && <span className="unread-dot" aria-hidden />}
        </button>

        <button className="timer-icon-btn" onClick={() => setShowHowto(true)} title="How it works" aria-label="How it works">
          <HelpCircle size={18} strokeWidth={1.8} />
        </button>

        <button className="timer-icon-btn" onClick={() => setShowSetup(true)} title="Set up this device" aria-label="Set up this device">
          <Smartphone size={18} strokeWidth={1.8} />
        </button>

        {/* Parent work happens on a signed-in phone. A kiosk has no Clerk
            session, so /parent would render a portal whose writes it can't
            authorize — better not to offer the door. */}
        {!kiosk && (
          <button className="timer-icon-btn settings-btn" onClick={() => navigate('/parent')} title="Parent Panel" aria-label="Parent Panel">
            <Settings size={18} strokeWidth={1.8} />
          </button>
        )}
      </div>

      {showHowto && <HowItWorksModal onClose={() => setShowHowto(false)} />}
      {showNews && <WhatsNewModal onClose={() => setShowNews(false)} />}
      {showSetup && <DeviceSetupModal onClose={() => setShowSetup(false)} />}
    </div>
  )
}

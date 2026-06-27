import { useEffect } from 'react'
import { Smartphone, Bell, CheckCircle2, Share, Plus, Lock } from 'lucide-react'
import { usePushSubscription } from '../hooks/usePushSubscription'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { untrustChild } from '../utils/childTrust'

// Reusable per-device setup guide: add-to-home-screen + enable notifications.
// `childId`/`label` make the push step context-aware — parent device when null,
// a specific child's device when opened from that child's view. When `familySlug`
// is set (child view), a third "device access" beat reflects the PIN gate and
// lets the parent re-lock the device.
export default function DeviceSetupModal({ onClose, childId = null, label, familySlug = null }) {
  const { canInstall, isInstalled, promptInstall, platform } = usePwaInstall()
  const push = usePushSubscription(childId)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // iOS only exposes the Push API inside an installed PWA, so install must come first.
  const pushBlocked = platform === 'ios' && !isInstalled

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card devsetup-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        <div className="howto-header">
          <h2 className="modal-title">Set up this device</h2>
          <p className="modal-points-line">
            A few quick steps to make nestboard feel like an app{label ? ` on ${label}'s device` : ''}.
          </p>
        </div>

        <div className="devsetup-steps">
          <div className="devsetup-step">
            <div className={`devsetup-step-icon ${isInstalled ? 'done' : ''}`}>
              {isInstalled
                ? <CheckCircle2 size={20} strokeWidth={2} />
                : <Smartphone size={20} strokeWidth={1.8} />}
            </div>
            <div className="devsetup-step-body">
              <h3 className="howto-section-title">Add to the home screen</h3>
              <InstallStep
                isInstalled={isInstalled}
                canInstall={canInstall}
                platform={platform}
                promptInstall={promptInstall}
              />
            </div>
          </div>

          <div className="devsetup-step">
            <div className={`devsetup-step-icon ${push.subscribed ? 'done' : ''}`}>
              {push.subscribed
                ? <CheckCircle2 size={20} strokeWidth={2} />
                : <Bell size={20} strokeWidth={1.8} />}
            </div>
            <div className="devsetup-step-body">
              <h3 className="howto-section-title">Turn on notifications</h3>
              <PushStep push={push} childId={childId} label={label} blocked={pushBlocked} />
            </div>
          </div>

          {familySlug && (
            <div className="devsetup-step">
              <div className="devsetup-step-icon done">
                <CheckCircle2 size={20} strokeWidth={2} />
              </div>
              <div className="devsetup-step-body">
                <h3 className="howto-section-title">Device access</h3>
                <p className="onboarding-guide-text">
                  This device is trusted — it opens {label ? `${label}'s page` : 'this page'} without the family PIN.
                </p>
                <button
                  className="devsetup-btn"
                  onClick={() => { untrustChild(familySlug); window.location.reload() }}
                >
                  <Lock size={14} strokeWidth={2} style={{ verticalAlign: '-2px', marginRight: 4 }} />
                  Lock this device
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InstallStep({ isInstalled, canInstall, platform, promptInstall }) {
  if (isInstalled) {
    return <p className="onboarding-guide-text">Installed — nestboard opens full-screen on this device.</p>
  }
  if (canInstall) {
    return (
      <>
        <p className="onboarding-guide-text">Install nestboard for a full-screen, app-like view.</p>
        <button className="devsetup-btn" onClick={promptInstall}>Install</button>
      </>
    )
  }
  if (platform === 'ios') {
    return (
      <p className="onboarding-guide-text">
        In Safari, tap <strong>Share</strong> <Share size={13} style={{ verticalAlign: '-2px' }} />,
        then <strong>Add to Home Screen</strong> <Plus size={13} style={{ verticalAlign: '-2px' }} />.
        Open nestboard from the new icon — that's what unlocks notifications too.
      </p>
    )
  }
  return (
    <p className="onboarding-guide-text">
      Open your browser menu and choose <strong>Install</strong> (or <strong>Add to Home screen</strong>)
      for a full-screen view.
    </p>
  )
}

function PushStep({ push, childId, label, blocked }) {
  const { supported, permission, subscribed, loading, subscribe } = push

  const desc = childId
    ? `Get reminders and updates on ${label || 'this'}'s device.`
    : 'Get a ping when a kid submits a chore for approval or asks for screen time.'

  if (blocked) {
    return (
      <p className="onboarding-guide-text">
        Add nestboard to the home screen first, then reopen it from the new icon to turn these on.
      </p>
    )
  }
  if (!supported) {
    return <p className="onboarding-guide-text">Notifications aren't supported in this browser.</p>
  }
  if (permission === 'denied') {
    return (
      <p className="onboarding-guide-text">
        Notifications are blocked. Turn them on for nestboard in your browser or device settings, then reopen this.
      </p>
    )
  }
  if (subscribed) {
    return <p className="onboarding-guide-text">On — this device will get notifications.</p>
  }
  return (
    <>
      <p className="onboarding-guide-text">{desc}</p>
      <button className="devsetup-btn" onClick={subscribe} disabled={loading}>
        {loading ? 'Enabling…' : 'Enable notifications'}
      </button>
    </>
  )
}

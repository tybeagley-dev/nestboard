import { useState } from 'react'
import { usePushSubscription } from '../hooks/usePushSubscription'
import DeviceSetupModal from './DeviceSetupModal'

export default function ParentNotificationsTab({ children }) {
  const parent = usePushSubscription(null)
  const [showSetup, setShowSetup] = useState(false)

  return (
    <div className="notif-tab">
      <div className="notif-section">
        <p className="notif-section-desc">
          New device? Walk through home-screen install and notifications in one place.
        </p>
        <button className="devsetup-btn" onClick={() => setShowSetup(true)}>Set up this device</button>
      </div>

      <div className="notif-section">
        <h3 className="notif-section-title">Parent notifications</h3>
        <p className="notif-section-desc">
          Get notified when a child submits a chore for approval or requests screen time.
        </p>
        <NotifToggle hook={parent} label="This device (parent)" />
      </div>

      {children.length > 0 && (
        <div className="notif-section">
          <h3 className="notif-section-title">Child notifications</h3>
          <p className="notif-section-desc">
            Open this page on each child's device and enable notifications for them individually.
          </p>
          {children.map(child => (
            <ChildNotifRow key={child.id} child={child} />
          ))}
        </div>
      )}

      {showSetup && <DeviceSetupModal onClose={() => setShowSetup(false)} />}
    </div>
  )
}

function ChildNotifRow({ child }) {
  const hook = usePushSubscription(child.id)
  return <NotifToggle hook={hook} label={child.name} />
}

function NotifToggle({ hook, label }) {
  const { supported, permission, subscribed, loading, subscribe, unsubscribe } = hook

  if (!supported) {
    return (
      <div className="notif-row">
        <span className="notif-label">{label}</span>
        <span className="notif-status notif-status--unsupported">Not supported on this device</span>
      </div>
    )
  }

  if (permission === 'denied') {
    return (
      <div className="notif-row">
        <span className="notif-label">{label}</span>
        <span className="notif-status notif-status--denied">Blocked — enable in Settings</span>
      </div>
    )
  }

  return (
    <div className="notif-row">
      <span className="notif-label">{label}</span>
      <button
        className={`notif-toggle-btn ${subscribed ? 'active' : ''}`}
        onClick={subscribed ? unsubscribe : subscribe}
        disabled={loading}
      >
        {loading ? '…' : subscribed ? 'On' : 'Off'}
      </button>
    </div>
  )
}

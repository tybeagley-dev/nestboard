import { useState } from 'react'
import { useFamily } from '../FamilyContext'
import { ChildQRSection } from '../components/ParentChildrenTab'
import DeviceSetupModal from '../components/DeviceSetupModal'

// Final screen. Celebrates, surfaces the per-child links, and opens the reusable
// device-setup guide (home-screen install + notifications).
export default function StepDone({ children }) {
  const family = useFamily()
  const [showSetup, setShowSetup] = useState(false)

  return (
    <div className="onboarding-done">
      <p className="onboarding-done-mark">🎉</p>
      <p className="onboarding-help">
        Your dashboard is ready{family?.name ? `, ${family.name}` : ''}! A couple of optional finishing touches:
      </p>

      {children.length > 0 && (
        <div className="onboarding-done-section">
          <p className="onboarding-guide-title">Each kid’s own view</p>
          <p className="onboarding-help">
            Every child has a personal page showing just their stuff. Scan or copy a link onto their device to bookmark it.
          </p>
          <ChildQRSection children={children} slug={family?.slug} />
        </div>
      )}

      <div className="onboarding-done-section">
        <p className="onboarding-guide-title">Put it on the fridge</p>
        <p className="onboarding-help">
          Add the dashboard to your tablet's home screen for a full-screen view, and turn on notifications
          so you hear about approvals and screen-time requests.
        </p>
        <button className="devsetup-btn" onClick={() => setShowSetup(true)}>Set up this device</button>
      </div>

      <p className="onboarding-help">Hit <strong>Finish</strong> below to head to your dashboard.</p>

      {showSetup && <DeviceSetupModal onClose={() => setShowSetup(false)} />}
    </div>
  )
}

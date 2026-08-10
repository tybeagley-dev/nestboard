import { useState } from 'react'
import { useFamily } from '../FamilyContext'
import { ChildQRSection } from '../components/ParentChildrenTab'
import DeviceSetupModal from '../components/DeviceSetupModal'
import KioskLinkCard from '../components/KioskLinkCard'

// Final screen. Celebrates, then hands over the two links a family needs to get
// nestboard onto actual devices.
//
// No family name in the congratulation: it read oddly for most names ("Your
// dashboard is ready, Beagley!") and the greeting step already covers how the
// family wants to be addressed.
export default function StepDone({ children }) {
  const family = useFamily()
  const [showSetup, setShowSetup] = useState(false)

  return (
    <div className="onboarding-done">
      <p className="onboarding-done-mark">🎉</p>
      <p className="onboarding-help">
        Your dashboard is ready! A couple of optional finishing touches:
      </p>

      {children.length > 0 && (
        <div className="onboarding-done-section">
          <p className="onboarding-guide-title">Each child’s own view</p>
          <p className="onboarding-help">
            Every child has a personal page showing just their stuff. Scan or copy a link onto their device to bookmark it.
          </p>
          <ChildQRSection children={children} slug={family?.slug} />
        </div>
      )}

      {/* KioskLinkCard carries its own explanation — anything written here as well
          just says the same thing twice in two voices. */}
      <div className="onboarding-done-section">
        <p className="onboarding-guide-title">Put it on the fridge</p>
        <KioskLinkCard familySlug={family?.slug} />
        <p className="onboarding-help">
          Once it’s open on that tablet, add it to the home screen there for a full-screen view.
          Notifications are different — turn those on <strong>here, on the device you’re using now</strong>,
          so approvals and screen-time requests reach you rather than the family board.
        </p>
        <button className="devsetup-btn" onClick={() => setShowSetup(true)}>Set up this device</button>
      </div>

      <p className="onboarding-help">Hit <strong>Finish</strong> below to head to your dashboard.</p>

      {showSetup && <DeviceSetupModal onClose={() => setShowSetup(false)} />}
    </div>
  )
}

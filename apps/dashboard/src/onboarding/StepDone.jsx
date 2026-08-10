import { useState } from 'react'
import { useFamily } from '../FamilyContext'
import { ChildQRSection } from '../components/ParentChildrenTab'
import DeviceSetupModal from '../components/DeviceSetupModal'
import FamilyIdentityCard from '../components/FamilyIdentityCard'
import KioskLinkCard from '../components/KioskLinkCard'

// Final screen. Celebrates, tunes the greeting, surfaces the per-child links, and
// points the family display at the kiosk link.
export default function StepDone({ children }) {
  const family = useFamily()
  const [showSetup, setShowSetup] = useState(false)
  // Local copy so renaming here doesn't leave a stale name in the line above; the
  // wizard's onComplete refetches /auth/family, so the app picks it up on Finish.
  const [identity, setIdentity] = useState({ name: family?.name ?? '', greeting: family?.greeting ?? '' })

  return (
    <div className="onboarding-done">
      <p className="onboarding-done-mark">🎉</p>
      <p className="onboarding-help">
        Your dashboard is ready{identity.name ? `, ${identity.name}` : ''}! A couple of optional finishing touches:
      </p>

      <div className="onboarding-done-section">
        <p className="onboarding-guide-title">How your board greets you</p>
        <p className="onboarding-help">
          The dashboard opens with a greeting built from your family name. Change the second line if it
          reads better another way.
        </p>
        <FamilyIdentityCard family={family} onSaved={setIdentity} />
      </div>

      {children.length > 0 && (
        <div className="onboarding-done-section">
          <p className="onboarding-guide-title">Each child’s own view</p>
          <p className="onboarding-help">
            Every child has a personal page showing just their stuff. Scan or copy a link onto their device to bookmark it.
          </p>
          <ChildQRSection children={children} slug={family?.slug} />
        </div>
      )}

      <div className="onboarding-done-section">
        <p className="onboarding-guide-title">Put it on the fridge</p>
        <p className="onboarding-help">
          If you leave a tablet out for the whole family, open the <strong>family display link</strong> on
          it rather than signing in there. It shows the full board and lets everyone check things off,
          spin chores and run timers — but it can’t reach approvals, settings or your account, so a shared
          screen never holds your login. Approvals happen on your phone.
        </p>
        <KioskLinkCard familySlug={family?.slug} />
        <p className="onboarding-help">
          Then add it to that tablet’s home screen for a full-screen view, and turn on notifications so you
          hear about approvals and screen-time requests.
        </p>
        <button className="devsetup-btn" onClick={() => setShowSetup(true)}>Set up this device</button>
      </div>

      <p className="onboarding-help">Hit <strong>Finish</strong> below to head to your dashboard.</p>

      {showSetup && <DeviceSetupModal onClose={() => setShowSetup(false)} />}
    </div>
  )
}

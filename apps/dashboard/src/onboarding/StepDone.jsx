import { useFamily } from '../FamilyContext'
import { ChildQRSection } from '../components/ParentChildrenTab'

// Final screen. Celebrates, surfaces the per-child links, and points at home-screen
// install. (A full device-setup guide is a separate, reusable feature — later.)
export default function StepDone({ children }) {
  const family = useFamily()

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
          Open this dashboard on your tablet, then add it to the home screen for a full-screen view. (A step-by-step
          device guide is coming soon.)
        </p>
      </div>

      <p className="onboarding-help">Hit <strong>Finish</strong> below to head to your dashboard.</p>
    </div>
  )
}

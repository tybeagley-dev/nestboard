import ChangePinCard from './ChangePinCard'
import FeedbackCard from './FeedbackCard'
import FamilyMembers from './FamilyMembers'
import AccountCard from './AccountCard'
import FamilyNotesCard from './FamilyNotesCard'
import StepIdentity from '../onboarding/StepIdentity'
import { useFamily } from '../FamilyContext'

// Who the family is and who can act for it. Device setup lives in Devices,
// feature configuration in Settings.
export default function ParentFamilyTab({ onPinChanged }) {
  const family = useFamily()

  if (!family) return <p className="parent-soon-msg">Loading…</p>

  return (
    <div className="parent-family-tab">
      <div className="family-code-card">
        <div className="family-code-section">
          <span className="family-code-label">Family name & greeting</span>
          <StepIdentity />
        </div>
      </div>

      <FamilyNotesCard />

      <FamilyMembers familySlug={family.slug} />

      <AccountCard />

      <ChangePinCard onPinChanged={onPinChanged} />

      <FeedbackCard />
    </div>
  )
}

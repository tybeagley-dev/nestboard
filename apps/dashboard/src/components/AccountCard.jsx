import { useUser, UserButton } from '@clerk/react'

// Clerk already tracks every signed-in session with its device, browser, IP and
// last-active time, and can revoke them — the app just never exposed the door.
// Without this there is no way to sign out of nestboard at all, so a parent who
// signs in on a borrowed or shared machine can't end that session.
//
// Deliberately lives in the PIN-gated parent portal, not the kiosk ribbon: the
// kiosk is a shared device anyone in the house can touch, and a sign-out control
// (or the parent's account details) doesn't belong there.
//
// Only covers Clerk-authenticated devices. The kiosk and child tablets have no
// Clerk identity — they authenticate with the family slug and are managed
// separately.
export default function AccountCard() {
  const { isSignedIn, user } = useUser()
  if (!isSignedIn) return null

  return (
    <div className="family-code-card">
      <div className="family-code-section">
        <span className="chore-form-label">Your account</span>
        <div className="account-card-row">
          <UserButton afterSignOutUrl="/" />
          <div className="account-card-info">
            <span className="account-card-email">
              {user?.primaryEmailAddress?.emailAddress ?? 'Signed in'}
            </span>
            <span className="chore-form-hint">
              Open your account to see the devices you're signed in on, and sign out of any of
              them — including this one.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

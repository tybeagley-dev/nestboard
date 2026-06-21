import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth, SignIn } from '@clerk/react'
import { setTokenGetter, apiGet } from './utils/api'
import Dashboard from './Dashboard'
import ParentPage from './ParentPage'
import ChildView from './ChildView'
import FamilySetup from './FamilySetup'
import JoinInvite from './JoinInvite'
import OnboardingWizard from './OnboardingWizard'
import { FamilyProvider } from './FamilyContext'

// Requires a signed-in Clerk user; does NOT gate on family membership (so the
// invite-accept screen can render for a user who isn't in a family yet).
function AuthGate({ children }) {
  const { isSignedIn, isLoaded, getToken } = useAuth()

  // Set synchronously during render so child effects have the token on first fetch
  if (isSignedIn && getToken) setTokenGetter(getToken)

  if (!isLoaded) return null

  if (!isSignedIn) {
    // Return to the current path after auth (e.g. /join/<token>), not Clerk's
    // default "/", so an invite link survives the sign-in/up redirect.
    const redirect = window.location.pathname + window.location.search
    return (
      <div className="clerk-signin-wrap">
        <SignIn routing="hash" forceRedirectUrl={redirect} signUpForceRedirectUrl={redirect} />
      </div>
    )
  }

  return children
}

function FamilyGate({ children }) {
  const [family,  setFamily]  = useState(undefined) // undefined = loading
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    apiGet('/auth/family').then(data => setFamily(data ?? null))
  }, [retryKey])

  if (family === undefined) return null

  if (!family || family.familyId === null) {
    return <FamilySetup onComplete={() => setRetryKey(k => k + 1)} />
  }

  if (!family.onboarded) {
    return (
      <FamilyProvider family={family}>
        <OnboardingWizard onComplete={() => setRetryKey(k => k + 1)} />
      </FamilyProvider>
    )
  }

  return <FamilyProvider family={family}>{children}</FamilyProvider>
}

export default function App() {
  return (
    <Routes>
      <Route path="/:slug/child/:childId" element={<ChildView />} />
      <Route path="/join/:token" element={<AuthGate><JoinInvite /></AuthGate>} />
      <Route
        path="*"
        element={
          <AuthGate>
            <FamilyGate>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/parent" element={<ParentPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </FamilyGate>
          </AuthGate>
        }
      />
    </Routes>
  )
}

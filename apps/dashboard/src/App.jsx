import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth, SignIn, SignUp } from '@clerk/react'
import { setTokenGetter, apiGet } from './utils/api'
import Landing from './Landing'
import Dashboard from './Dashboard'
import ParentPage from './ParentPage'
import ChildView from './ChildView'
import FamilySetup from './FamilySetup'
import JoinInvite from './JoinInvite'
import AdminPage from './AdminPage'
import OnboardingWizard from './OnboardingWizard'
import ConsentGate from './components/ConsentGate'
import LegalDoc from './components/LegalDoc'
import { FamilyProvider } from './FamilyContext'

// Requires a signed-in Clerk user; does NOT gate on family membership (so the
// invite-accept screen can render for a user who isn't in a family yet).
function AuthGate({ children }) {
  const { isSignedIn, isLoaded, getToken } = useAuth()

  // Set synchronously during render so child effects have the token on first fetch
  if (isSignedIn && getToken) setTokenGetter(getToken)

  if (!isLoaded) return null

  if (!isSignedIn) {
    // Logged-out visitors landing on "/" get the marketing page, not a bare
    // sign-in form. Deep links (e.g. /parent, /join/<token>) still go straight
    // to auth so the destination survives the redirect.
    if (window.location.pathname === '/') return <Landing />

    // Return to the current path after auth (e.g. /join/<token>), not Clerk's
    // default "/", so an invite link survives the sign-in/up redirect.
    // `withSignUp` enables the combined sign-in-or-up flow so brand-new users
    // (e.g. an invited partner) can create an account — including via OAuth —
    // instead of hitting "External Account was not found".
    const redirect = window.location.pathname + window.location.search
    return (
      <div className="clerk-signin-wrap">
        <SignIn routing="hash" withSignUp forceRedirectUrl={redirect} signUpForceRedirectUrl={redirect} />
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
      <Route path="/privacy" element={<LegalDoc which="privacy" />} />
      <Route path="/terms" element={<LegalDoc which="terms" />} />
      <Route
        path="/sign-in"
        element={
          <div className="clerk-signin-wrap">
            <SignIn routing="hash" withSignUp forceRedirectUrl="/" signUpForceRedirectUrl="/" signUpUrl="/sign-up" />
          </div>
        }
      />
      <Route
        path="/sign-up"
        element={
          <div className="clerk-signin-wrap">
            <SignUp routing="hash" forceRedirectUrl="/" signInUrl="/sign-in" />
          </div>
        }
      />
      <Route path="/join/:token" element={<AuthGate><ConsentGate><JoinInvite /></ConsentGate></AuthGate>} />
      <Route path="/admin" element={<AuthGate><AdminPage /></AuthGate>} />
      <Route
        path="*"
        element={
          <AuthGate>
            <ConsentGate>
            <FamilyGate>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/parent" element={<ParentPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </FamilyGate>
            </ConsentGate>
          </AuthGate>
        }
      />
    </Routes>
  )
}

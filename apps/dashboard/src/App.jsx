import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth, SignIn } from '@clerk/react'
import { setTokenGetter } from './utils/api'
import Dashboard from './Dashboard'
import ParentPage from './ParentPage'

function AuthGate({ children }) {
  const { isSignedIn, isLoaded, getToken } = useAuth()

  // Set synchronously during render so child effects have the token on first fetch
  if (isSignedIn && getToken) setTokenGetter(getToken)

  if (!isLoaded) return null

  if (!isSignedIn) {
    return (
      <div className="clerk-signin-wrap">
        <SignIn routing="hash" />
      </div>
    )
  }

  return children
}

export default function App() {
  return (
    <AuthGate>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/parent" element={<ParentPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthGate>
  )
}

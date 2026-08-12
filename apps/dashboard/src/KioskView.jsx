import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Dashboard from './Dashboard'
import DevicePairing from './components/DevicePairing'
import { setFamilySlug, setDeviceToken, onDeviceRevoked } from './utils/api'
import { getDeviceToken, clearDeviceToken } from './utils/deviceToken'
import { useFamilyPayload } from './hooks/useFamilySettings'
import { FamilyProvider } from './FamilyContext'

// The shared-device kiosk, authenticated by slug rather than by a parent's Clerk
// session.
//
// The dashboard at "/" sits behind AuthGate, so a fridge tablet running it holds
// an owner session permanently — the most privileged credential in the system on
// the most physically exposed device in the house. Anyone reaching a console
// there could mint invites, remove members or transfer ownership, and the PIN
// prompt on the parent portal is client-side only, so it wasn't stopping them.
//
// Everything a kiosk legitimately does — routines, the chore spinner, timers,
// tokens, screen-time requests, grocery, meals — is already requireFamily, i.e.
// reachable with the slug. So the kiosk needs no parent authority at all, and the
// fix is to stop giving it any rather than to guard it better. Parent work
// happens on a phone, signed in.
export default function KioskView() {
  const { slug } = useParams()

  // Both synchronous so the first request out of this view — pairing, or a data
  // fetch on an already-paired display — carries the right headers.
  setFamilySlug(slug)

  const [token, setToken] = useState(() => getDeviceToken(slug))
  setDeviceToken(token)

  // A parent revoking this display from the Devices tab is the only way it can
  // lose its credential mid-session. It drops back to pairing rather than
  // sitting on a board it can no longer refresh — a fridge display that quietly
  // stops updating is worse than one asking to be set up again.
  useEffect(() => {
    onDeviceRevoked(() => { clearDeviceToken(slug); setToken(null) })
    return () => onDeviceRevoked(null)
  }, [slug])

  // Pairing replaces the old client-side trust flag. That gate set a boolean the
  // server never saw, so the API went on accepting the slug from anyone holding
  // the URL — deterrence, not access control. The PIN now buys a real credential
  // that a parent can take back.
  if (!token) {
    return (
      <div className="child-view-loading">
        <DevicePairing
          slug={slug}
          kind="kiosk"
          defaultLabel="Family display"
          onPaired={setToken}
        />
      </div>
    )
  }

  return <KioskFamily />
}

function KioskFamily() {
  const family = useFamilyPayload()
  return (
    <FamilyProvider family={family}>
      <Dashboard kiosk />
    </FamilyProvider>
  )
}

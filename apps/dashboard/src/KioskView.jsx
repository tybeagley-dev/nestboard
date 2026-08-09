import { useState } from 'react'
import { useParams } from 'react-router-dom'
import Dashboard from './Dashboard'
import PinModal from './components/PinModal'
import { setFamilySlug } from './utils/api'
import { isChildTrusted, trustChild } from './utils/childTrust'
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

  // Synchronous so PinModal's /auth/parent call is scoped to this family.
  setFamilySlug(slug)

  const [trusted, setTrusted] = useState(() => isChildTrusted(slug))

  // Same once-per-device gate as the child views, and the same caveat: this is
  // deterrence against a link that got forwarded somewhere, not access control.
  // The slug is in the URL, so anyone holding it can call the API directly and
  // never see this. Revoking that needs per-device tokens.
  if (!trusted) {
    return (
      <div className="child-view-loading">
        <PinModal
          prompt="Enter family PIN to set up this display"
          dismissable={false}
          onSuccess={() => { trustChild(slug); setTrusted(true) }}
          onCancel={() => {}}
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

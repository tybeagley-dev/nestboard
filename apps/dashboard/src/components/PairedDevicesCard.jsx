import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiDelete } from '../utils/api'

// The shared devices paired to this family — the fridge display and any tablet a
// child uses. Parent devices aren't here: those hold a Clerk session, and Clerk's
// own account panel already lists and revokes them.
//
// This card is the point of device tokens. Before them the family slug was the
// credential, and a slug can't be taken back from one device without breaking
// every other one. Here, each device is a row with a Remove button.

function lastSeen(iso) {
  if (!iso) return 'never'
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  // last_seen_at is only refreshed once an hour (see api utils/deviceTokens.js),
  // so anything finer than this would be reporting precision that isn't there.
  if (mins < 90) return 'active today'
  const days = Math.floor(mins / 1440)
  if (days < 1) return 'active today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  return 'over a month ago'
}

export default function PairedDevicesCard() {
  const [devices, setDevices] = useState([])
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    apiGet('/auth/family/devices').then(d => setDevices(Array.isArray(d) ? d : []))
  }, [])

  useEffect(() => { load() }, [load])

  async function remove(device) {
    if (!confirm(
      `Remove "${device.label}"?\n\n` +
      `It will ask for the family PIN again next time someone opens nestboard on it.`
    )) return
    setBusy(true)
    await apiDelete(`/auth/family/devices/${device.id}`)
    setBusy(false)
    load()
  }

  async function removeAll() {
    if (!confirm(
      `Remove all ${devices.length} devices?\n\n` +
      `Every display and tablet will ask for the family PIN again. Use this if a ` +
      `device was lost or the PIN got out — changing the PIN on its own does not ` +
      `sign these out.`
    )) return
    setBusy(true)
    await apiDelete('/auth/family/devices')
    setBusy(false)
    load()
  }

  return (
    <div className="family-code-card">
      <div className="family-code-section">
        <span className="family-code-label">Paired devices</span>
        <p className="family-code-hint">
          Displays and tablets set up with your family PIN. Removing one doesn't
          affect the others — it just asks for the PIN again next time.
        </p>

        {devices.length === 0 ? (
          <p className="family-code-hint">
            Nothing paired yet. Open the kiosk link or a child's page on a device
            and enter the family PIN to set it up.
          </p>
        ) : (
          <ul className="member-list">
            {devices.map(d => (
              <li key={d.id} className="member-row">
                <span className="member-email">{d.label}</span>
                <span className="member-role">{lastSeen(d.last_seen_at)}</span>
                <button className="member-remove" disabled={busy} onClick={() => remove(d)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* The button people reach for the PIN hoping to get. Changing the PIN
            stops new pairings but leaves paired devices working, so without this
            there'd be no single action for "a tablet is gone". */}
        {devices.length > 1 && (
          <button className="member-remove devices-remove-all" disabled={busy} onClick={removeAll}>
            Remove all devices
          </button>
        )}
      </div>
    </div>
  )
}

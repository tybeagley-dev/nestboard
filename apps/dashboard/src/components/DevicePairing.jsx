import { useState } from 'react'
import PinModal from './PinModal'
import { storeDeviceToken } from '../utils/deviceToken'

// Setting up a shared device: the kiosk on the fridge, or a tablet a child uses.
//
// This is a PARENT-FACING screen, not a gate a child is meant to get past. The
// intended moment is a parent standing at the device typing the family PIN into
// it, rather than sending a link and the PIN to someone else — so the wording
// addresses the adult holding the tablet.
//
// The name is asked for first because the token is issued with it, and it is the
// only thing that makes the Devices list actionable later: "Kitchen display" is
// a row you can decide about, four lines of Mozilla/5.0 are not.
export default function DevicePairing({ slug, kind = 'kiosk', childId = null, defaultLabel = 'Shared device', onPaired }) {
  const [label, setLabel] = useState(defaultLabel)
  const [naming, setNaming] = useState(true)

  const clean = label.trim().slice(0, 60)

  function handlePaired(data) {
    storeDeviceToken(slug, data.token)
    onPaired(data.token)
  }

  if (!naming) {
    return (
      <PinModal
        prompt={`Enter your family PIN to set up "${clean}"`}
        dismissable={false}
        pair={{ label: clean, kind, childId }}
        onSuccess={handlePaired}
        onCancel={() => {}}
      />
    )
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card pin-modal">
        <div className="tokens-pin-phase">
          <h2 className="device-pair-title">Set up this device</h2>
          <p className="pin-prompt">
            Give it a name you'll recognize later, so you can remove it from the
            parent panel if it's ever lost or replaced.
          </p>
          <form
            className="device-pair-form"
            onSubmit={e => { e.preventDefault(); if (clean) setNaming(false) }}
          >
            <input
              className="chore-form-input"
              value={label}
              onChange={e => setLabel(e.target.value)}
              maxLength={60}
              autoFocus
              aria-label="Device name"
            />
            <button className="btn-confirm-spend" type="submit" disabled={!clean}>
              Continue
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

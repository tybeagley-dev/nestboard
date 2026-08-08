import { LATEST_RELEASE } from '../content/releases'

// Per-device, like the how-it-works flag — a family's kiosk and each phone track
// their own unread state rather than sharing one.
const SEEN_KEY = 'nestboard_releases_seen'

// No stored value means the device has never opened the notes, which includes
// every device that predates this feature — so it counts as unread. That's what
// makes the first release after deploy actually surface.
export function hasUnreadRelease() {
  if (!LATEST_RELEASE) return false
  try {
    return localStorage.getItem(SEEN_KEY) !== LATEST_RELEASE
  } catch {
    return false
  }
}

export function markReleasesSeen() {
  try {
    if (LATEST_RELEASE) localStorage.setItem(SEEN_KEY, LATEST_RELEASE)
  } catch { /* private mode — the dot just reappears next load */ }
}

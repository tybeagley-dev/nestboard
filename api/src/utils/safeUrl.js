// Validation for URLs the server will fetch or POST to on a user's behalf.
//
// Two places accept a URL from a request and then make the server talk to it:
// calendars (an iCal feed, fetched on a schedule) and push subscriptions (an
// endpoint web-push delivers to). Without this, either one points the API at
// http://localhost:3001, at Railway's private network, or at a cloud metadata
// endpoint — a request that comes from inside the perimeter.
//
// LIMITATION, stated plainly: this checks the hostname as written. It does not
// resolve DNS, so a hostname that resolves to a private address still passes, and
// a rebinding attack that answers differently on the second lookup is not
// addressed. Closing that properly means resolving first and pinning the
// connection to the resolved address. This raises the floor; it isn't airtight.

const BLOCKED_HOSTNAMES = new Set([
  'localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]',
  // Cloud instance metadata — the classic SSRF payoff.
  '169.254.169.254', 'metadata.google.internal', 'metadata',
])

function isBlockedIpv4(hostname) {
  const m = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!m) return false
  const [a, b] = [Number(m[1]), Number(m[2])]
  if (a === 10) return true                        // 10.0.0.0/8
  if (a === 127) return true                       // loopback
  if (a === 169 && b === 254) return true          // link-local + metadata
  if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12
  if (a === 192 && b === 168) return true          // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true // CGNAT 100.64.0.0/10
  if (a === 0) return true
  return false
}

// Only ever called for actual IPv6 literals. The fc00::/7 prefix check is two
// letters long, so running it against a DNS name blocks anything starting "fc"
// or "fd" — fcm.googleapis.com, the endpoint every Chrome push subscription
// uses, among them.
function isBlockedIpv6(hostname) {
  const h = hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (!h.includes(':')) return false
  if (h === '::1' || h === '::') return true
  if (h.startsWith('fe80')) return true                     // link-local
  if (h.startsWith('fc') || h.startsWith('fd')) return true // unique local
  return false
}

// Returns the normalized URL string, or null if it isn't safe to fetch.
// webcal:// is rewritten to https:// when allowWebcal is set (calendar feeds are
// routinely published that way).
export function safeFetchUrl(raw, { allowWebcal = false } = {}) {
  if (typeof raw !== 'string' || !raw.trim()) return null

  let candidate = raw.trim()
  if (allowWebcal) candidate = candidate.replace(/^webcal:\/\//i, 'https://')

  let url
  try { url = new URL(candidate) } catch { return null }

  // https only. http would let a network-positioned attacker see or alter the
  // feed, and it's the scheme every internal service answers on.
  if (url.protocol !== 'https:') return null

  // Credentials in the URL get sent to whatever the host turns out to be.
  if (url.username || url.password) return null

  const host = url.hostname.toLowerCase()
  if (BLOCKED_HOSTNAMES.has(host)) return null
  if (host.endsWith('.local') || host.endsWith('.internal')) return null
  if (!host.includes('.') && !host.includes(':')) return null // bare hostnames are internal
  if (isBlockedIpv4(host)) return null
  if (isBlockedIpv6(host)) return null

  return url.toString()
}

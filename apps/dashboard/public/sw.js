self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

// iOS reads the manifest from the HTML as first served and launches the
// home-screen icon at its start_url — it ignores runtime JS changes to the
// <link> and ignores blob:/data: manifests. So we (1) synthesize a per-page
// manifest at a real same-origin URL, and (2) rewrite the app-shell HTML on
// navigation to point the manifest <link> at this page's start_url. Together a
// child page installs as its own icon / iOS push scope.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)

  if (url.pathname === '/page-manifest.webmanifest') {
    const start = url.searchParams.get('start_url') || '/'
    const name  = url.searchParams.get('name') || 'nestboard'
    const body = JSON.stringify({
      name,
      short_name: name,
      start_url: start,
      scope: start,
      id: start,
      display: 'standalone',
      background_color: '#F2EDE4',
      theme_color: '#F2EDE4',
      icons: [
        { src: '/icon-192.png',         sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png',         sizes: '512x512', type: 'image/png' },
        { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      ],
    })
    e.respondWith(new Response(body, { headers: { 'Content-Type': 'application/manifest+json' } }))
    return
  }

  if (e.request.mode === 'navigate') {
    e.respondWith(rewriteShell(e.request))
  }
})

async function rewriteShell(request) {
  try {
    const res = await fetch(request)
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('text/html')) return res
    const html = await res.text()
    const path = new URL(request.url).pathname
    const link = `<link rel="manifest" href="/page-manifest.webmanifest?start_url=${encodeURIComponent(path)}">`
    const out = html.replace(/<link rel="manifest"[^>]*>/, link)
    return new Response(out, {
      status: res.status,
      statusText: res.statusText,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch {
    return fetch(request)
  }
}

self.addEventListener('push', e => {
  let data = {}
  try { data = e.data?.json() ?? {} } catch { data = { title: e.data?.text() ?? 'nestboard' } }
  e.waitUntil(
    self.registration.showNotification(data.title ?? 'nestboard', {
      body: data.body ?? '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      // Carried through to notificationclick. The server doesn't send a url yet;
      // when it does (e.g. approvals → /parent) this needs no change here.
      data: { url: data.url ?? '/' },
    })
  )
})

// Focus an already-open window rather than opening a new one.
//
// This used to call openWindow('/') unconditionally. On iOS an installed PWA has
// its own storage partition, separate from Safari — so a tap that opened a fresh
// context could land outside the PWA, where the Clerk session doesn't exist, and
// the parent would be asked to sign in again despite having had the app open
// moments earlier.
self.addEventListener('notificationclick', e => {
  e.notification.close()
  const target = e.notification.data?.url || '/'

  e.waitUntil((async () => {
    // includeUncontrolled: a window loaded before this service worker took over
    // is still ours and still signed in.
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const mine = all.filter(c => {
      try { return new URL(c.url).origin === self.location.origin } catch { return false }
    })

    if (mine.length) {
      // Prefer one already on the target path, else just take the first.
      const exact = mine.find(c => new URL(c.url).pathname === target)
      const client = exact ?? mine[0]
      try { await client.focus() } catch {}
      if (!exact && target !== '/' && 'navigate' in client) {
        try { await client.navigate(target) } catch {}
      }
      return
    }

    await self.clients.openWindow(target)
  })())
})

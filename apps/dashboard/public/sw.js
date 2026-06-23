self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

// iOS only honors a manifest fetched from a real same-origin URL (it ignores
// blob:/data:), and launches the home-screen icon at the manifest start_url.
// Synthesize a per-page manifest so a child page installs as its own icon.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)
  if (url.pathname !== '/page-manifest.webmanifest') return
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
})

self.addEventListener('push', e => {
  let data = {}
  try { data = e.data?.json() ?? {} } catch { data = { title: e.data?.text() ?? 'nestboard' } }
  e.waitUntil(
    self.registration.showNotification(data.title ?? 'nestboard', {
      body: data.body ?? '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    })
  )
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  e.waitUntil(clients.openWindow('/'))
})

self.addEventListener('push', e => {
  let data = {}
  try { data = e.data?.json() ?? {} } catch { data = { title: e.data?.text() ?? 'Hearthboard' } }
  e.waitUntil(
    self.registration.showNotification(data.title ?? 'Hearthboard', {
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

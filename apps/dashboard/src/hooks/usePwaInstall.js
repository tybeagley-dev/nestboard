import { useEffect, useState } from 'react'

// `beforeinstallprompt` fires once, early — often before any modal mounts. Capture
// it at module load (this file is imported in main.jsx) so the deferred prompt is
// ready whenever the device-setup guide opens. iOS/Safari never fires it; there we
// fall back to manual "Add to Home Screen" instructions keyed off the platform.
let deferredPrompt = null
let installed = false
const listeners = new Set()

function emit() { listeners.forEach(fn => fn()) }

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault()
    deferredPrompt = e
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    installed = true
    emit()
  })
}

export function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches
    || window.navigator.standalone === true
}

export function getPlatform() {
  const ua = navigator.userAgent || ''
  // Modern iPadOS reports as a Mac; the touch-points check disambiguates.
  if (/iphone|ipad|ipod/i.test(ua) || (/Mac/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios'
  if (/android/i.test(ua)) return 'android'
  return 'desktop'
}

// iOS (16.4+) launches a home-screen icon at the manifest's `start_url`, ignoring
// which page you actually added, and only honors a manifest served from a real
// same-origin URL. Point the link at the service-worker-synthesized per-page
// manifest (see sw.js) so a child page installs as its own icon / iOS push scope.
export function useInstallManifest(startUrl, name) {
  useEffect(() => {
    if (!startUrl) return
    const link = document.querySelector('link[rel="manifest"]')
    if (!link) return
    const titleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]')
    const originalHref  = link.getAttribute('href')
    const originalTitle = titleMeta?.getAttribute('content')

    const params = new URLSearchParams({ start_url: startUrl })
    if (name) params.set('name', name)
    link.setAttribute('href', `/page-manifest.webmanifest?${params}`)
    if (name && titleMeta) titleMeta.setAttribute('content', name)

    return () => {
      if (originalHref) link.setAttribute('href', originalHref)
      if (titleMeta && originalTitle != null) titleMeta.setAttribute('content', originalTitle)
    }
  }, [startUrl, name])
}

export function usePwaInstall() {
  const [canInstall, setCanInstall]   = useState(!!deferredPrompt)
  const [isInstalled, setIsInstalled] = useState(installed || isStandalone())

  useEffect(() => {
    const update = () => {
      setCanInstall(!!deferredPrompt)
      setIsInstalled(installed || isStandalone())
    }
    listeners.add(update)
    update()
    return () => listeners.delete(update)
  }, [])

  async function promptInstall() {
    if (!deferredPrompt) return false
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') { deferredPrompt = null; emit() }
    return outcome === 'accepted'
  }

  return { canInstall, isInstalled, promptInstall, platform: getPlatform() }
}

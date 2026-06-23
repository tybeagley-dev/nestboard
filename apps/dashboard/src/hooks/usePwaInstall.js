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

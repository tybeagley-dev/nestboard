import { useState, useEffect } from 'react'
import { apiGet } from '../utils/api'
import { resolveSettings } from '../FamilyContext'

// Settings for surfaces outside FamilyProvider (the public child view). Fetches
// /auth/family by the active slug header and resolves defaults. Starts from the
// generic defaults so nothing flashes wrong before the fetch lands.
export function useFamilySettings() {
  const [settings, setSettings] = useState(() => resolveSettings(null))
  useEffect(() => {
    apiGet('/auth/family').then(data => setSettings(resolveSettings(data?.settings))).catch(() => {})
  }, [])
  return settings
}

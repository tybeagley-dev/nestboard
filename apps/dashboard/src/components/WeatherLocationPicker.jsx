import { useState } from 'react'
import { apiPut } from '../utils/api'

// City search via open-meteo's free geocoding API (no key). Picking a result
// saves { lat, lon, label } to the family's weather config.
export default function WeatherLocationPicker({ current, onSaved }) {
  const [query,     setQuery]     = useState('')
  const [results,   setResults]   = useState([])
  const [searching, setSearching] = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(current ?? null)
  const [error,     setError]     = useState(null)

  async function search(e) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setError(null)
    try {
      const res  = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=5`)
      const data = await res.json()
      const hits = data.results ?? []
      setResults(hits)
      if (!hits.length) setError('No matches — try a nearby city.')
    } catch {
      setError('Search failed — check your connection.')
      setResults([])
    }
    setSearching(false)
  }

  async function choose(r) {
    const label   = [r.name, r.admin1].filter(Boolean).join(', ')
    const weather = { lat: r.latitude, lon: r.longitude, label }
    setSaving(true)
    const data = await apiPut('/auth/family/weather', weather)
    setSaving(false)
    if (data?.success) {
      setSaved(weather)
      setResults([])
      setQuery('')
      onSaved?.(weather)
    } else {
      setError(data?.error ?? 'Could not save location.')
    }
  }

  return (
    <div className="weather-picker">
      {saved && (
        <p className="weather-picker-current">
          Current location: <strong>{saved.label}</strong>
        </p>
      )}
      <form className="weather-picker-search" onSubmit={search}>
        <input
          className="chore-form-input"
          value={query}
          onChange={e => { setQuery(e.target.value); setError(null) }}
          placeholder="Search your city…"
        />
        <button className="parent-apply-btn" type="submit" disabled={searching || !query.trim()}>
          {searching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && <p className="weather-picker-error">{error}</p>}

      {results.length > 0 && (
        <ul className="weather-picker-results">
          {results.map((r, i) => (
            <li key={i}>
              <button className="weather-picker-result" onClick={() => choose(r)} disabled={saving}>
                {[r.name, r.admin1, r.country].filter(Boolean).join(', ')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

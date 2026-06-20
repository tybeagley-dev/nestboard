import { useState, useEffect } from 'react'
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api'
import CalendarGuide from './CalendarGuide'

const COLOR_PRESETS = ['#C17A4A', '#6B8BA4', '#7D9B76', '#C4837A', '#A68B5B', '#8B7BB5', '#5B9BA6', '#A67B8B']

function emptyCalendar() {
  return { name: '', url: '', color: COLOR_PRESETS[0], child: '', is_family: false }
}

function CalendarForm({ calendar, onSave, onCancel, saving }) {
  const [name,     setName]     = useState(calendar.name      || '')
  const [url,      setUrl]      = useState(calendar.url       || '')
  const [color,    setColor]    = useState(calendar.color     || COLOR_PRESETS[0])
  const [isFamily, setIsFamily] = useState(calendar.is_family ?? false)

  function handleSave() {
    if (!name.trim() || !url.trim()) return
    onSave({ ...calendar, name: name.trim(), url: url.trim(), color, child: null, is_family: isFamily })
  }

  return (
    <div className="chore-form">
      <div className="chore-form-field">
        <label className="chore-form-label">Name</label>
        <input
          className="chore-form-input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Dad, Family, Nest Collective"
          autoFocus
        />
      </div>

      <div className="chore-form-field">
        <label className="chore-form-label">iCal URL</label>
        <input
          className="chore-form-input"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="webcal:// or https://"
        />
      </div>

      <div className="chore-form-field">
        <label className="chore-form-label">Color</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {COLOR_PRESETS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: 28, height: 28, borderRadius: '50%', background: c, border: 'none',
                cursor: 'pointer', outline: color === c ? '2px solid white' : 'none',
                boxShadow: color === c ? `0 0 0 3px ${c}` : 'none',
              }}
            />
          ))}
        </div>
      </div>

      <div className="chore-form-field">
        <label className="chore-form-label chore-form-toggle-label">
          <input
            type="checkbox"
            checked={isFamily}
            onChange={e => setIsFamily(e.target.checked)}
          />
          Show on child cards
        </label>
        <p className="chore-form-hint">Events from this calendar will appear in every child's upcoming view.</p>
      </div>

      <div className="chore-form-actions">
        <button className="parent-apply-btn" onClick={handleSave} disabled={saving || !name.trim() || !url.trim()}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button className="btn-cancel-spend" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </div>
  )
}

export default function ParentCalendarTab({ children, guideOpen = false }) {
  const [calendars, setCalendars] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [editing,   setEditing]   = useState(null)   // null | 'new' | calendar object
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState(null)

  async function load() {
    setLoading(true)
    const data = await apiGet('/calendar')
    setCalendars(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSave(cal) {
    setSaving(true)
    if (cal.id) {
      await apiPut(`/calendar/${cal.id}`, cal)
    } else {
      await apiPost('/calendar', cal)
    }
    setSaving(false)
    setEditing(null)
    load()
  }

  async function handleDelete(cal) {
    setDeleting(cal.id)
    await apiDelete(`/calendar/${cal.id}`)
    setDeleting(null)
    load()
  }

  if (loading) return <p className="tab-empty">Loading…</p>

  return (
    <div>
      <CalendarGuide defaultOpen={guideOpen} />

      {editing ? (
        <CalendarForm
          calendar={editing === 'new' ? emptyCalendar() : editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
          saving={saving}
        />
      ) : (
        <>
          <button className="parent-add-chore-btn" onClick={() => setEditing('new')}>+ Add Calendar</button>

          {calendars.length === 0 && (
            <p className="tab-empty">No calendars added yet.</p>
          )}

          <div>
            {calendars.map(cal => (
              <div key={cal.id} className="chore-admin-row">
                <span className="chore-admin-icon" style={{ color: cal.color }}>●</span>
                <div className="chore-admin-info">
                  <span className="chore-admin-label">{cal.name}</span>
                  {cal.is_family && <span className="chore-admin-meta">Shown on child cards</span>}
                </div>
                <button className="chore-admin-edit-btn" onClick={() => setEditing({ ...cal, is_family: cal.is_family })}>Edit</button>
                <button
                  className="chore-admin-del-btn"
                  onClick={() => handleDelete(cal)}
                  disabled={deleting === cal.id}
                >
                  {deleting === cal.id ? '…' : '×'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

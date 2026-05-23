import { useState } from 'react'
import { useRoutineDefs, adminAddRoutineDef, adminEditRoutineDef, adminDeleteRoutineDef } from '../hooks/useRoutines'

const SCHEDULES     = ['school', 'weekend', 'summer', 'holiday']
const SCHED_LABEL   = { school: 'School', weekend: 'Weekend', summer: 'Summer', holiday: 'Holiday' }

function emptyDef(child, childNames) {
  return { id: '', child: child || childNames[0] || '', label: '', icon: '', schedules: ['school', 'weekend', 'summer', 'holiday'], time: '', sortOrder: 0 }
}

// ── Routine row ───────────────────────────────────────────────────────────────

function RoutineRow({ def, onEdit, confirmDelete, onDeleteRequest, onConfirmDelete, onCancelDelete }) {
  if (confirmDelete) {
    return (
      <div className="chore-admin-row deleting">
        <span className="chore-delete-msg">Remove "{def.label}"?</span>
        <button className="chore-delete-yes" onClick={onConfirmDelete}>Remove</button>
        <button className="chore-delete-no"  onClick={onCancelDelete}>Cancel</button>
      </div>
    )
  }

  const timeLabel = def.time === 'morning' ? '☀️' : def.time === 'evening' ? '🌙' : '↕'

  return (
    <div className="chore-admin-row">
      <span className="chore-admin-icon">{def.icon || '•'}</span>
      <div className="chore-admin-info">
        <span className="chore-admin-label">{def.label}</span>
        <span className="chore-admin-meta">
          {def.schedules.map(s => SCHED_LABEL[s] ?? s).join(' · ')}
          {' · '}{timeLabel}
        </span>
      </div>
      <button className="chore-admin-edit-btn" onClick={onEdit}>Edit</button>
      <button className="chore-admin-del-btn"  onClick={onDeleteRequest}>×</button>
    </div>
  )
}

// ── Routine form ──────────────────────────────────────────────────────────────

function RoutineForm({ def, childNames, onSave, onCancel, saving }) {
  const [child,     setChild]     = useState(def.child || childNames[0] || '')
  const [label,     setLabel]     = useState(def.label || '')
  const [icon,      setIcon]      = useState(def.icon || '')
  const [schedules, setSchedules] = useState(def.schedules?.length ? def.schedules : ['school', 'weekend', 'summer', 'holiday'])
  const [time,      setTime]      = useState(def.time || '')

  function toggleSched(s) {
    setSchedules(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  function handleSave() {
    if (!label.trim()) return
    onSave({ ...def, child, label: label.trim(), icon, schedules, time })
  }

  return (
    <div className="chore-form">
      <div className="chore-form-row">
        <div className="chore-form-field">
          <label className="chore-form-label">Child</label>
          <div className="chore-form-toggle">
            {childNames.map(c => (
              <button key={c} className={child === c ? 'active' : ''} onClick={() => setChild(c)}>{c}</button>
            ))}
          </div>
        </div>
        <div className="chore-form-field">
          <label className="chore-form-label">Icon</label>
          <input className="chore-form-input chore-form-icon-input" value={icon} onChange={e => setIcon(e.target.value)} placeholder="🛏️" />
        </div>
      </div>

      <div className="chore-form-field">
        <label className="chore-form-label">Label</label>
        <input className="chore-form-input" value={label} onChange={e => setLabel(e.target.value)} placeholder="Brush hair" autoFocus />
      </div>

      <div className="chore-form-field">
        <label className="chore-form-label">Schedules</label>
        <div className="chore-form-days">
          {SCHEDULES.map(s => (
            <button key={s} className={`chore-day-chip ${schedules.includes(s) ? 'active' : ''}`} onClick={() => toggleSched(s)}>
              {SCHED_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="chore-form-field">
        <label className="chore-form-label">Time of day</label>
        <div className="chore-form-toggle">
          <button className={time === 'morning' ? 'active' : ''} onClick={() => setTime('morning')}>☀️ Morning</button>
          <button className={time === ''        ? 'active' : ''} onClick={() => setTime('')}>↕ Both</button>
          <button className={time === 'evening' ? 'active' : ''} onClick={() => setTime('evening')}>🌙 Evening</button>
        </div>
      </div>

      <div className="chore-form-actions">
        <button className="parent-apply-btn" onClick={handleSave} disabled={saving || !label.trim()}>
          {saving ? 'Saving…' : (def.id ? 'Save Changes' : 'Add Routine')}
        </button>
        <button className="btn-cancel-spend" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ── Tab root ──────────────────────────────────────────────────────────────────

export default function ParentRoutinesTab({ children }) {
  const childNames = children.map(c => c.name)
  const { defs, loading, reload } = useRoutineDefs()
  const [activeChild,   setActiveChild]   = useState(() => childNames[0] ?? '')
  const [form,          setForm]          = useState(null)
  const [saving,        setSaving]        = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  async function handleSave(data) {
    setSaving(true)
    const order = defs.filter(d => d.child === data.child).length
    if (data.id) await adminEditRoutineDef(data)
    else         await adminAddRoutineDef({ ...data, sortOrder: order })
    setSaving(false)
    await reload()
    setForm(null)
  }

  async function handleDelete(id) {
    await adminDeleteRoutineDef(id)
    setDeleteConfirm(null)
    await reload()
  }

  const childDefs = defs.filter(d => d.child === activeChild)

  if (form !== null) {
    return (
      <RoutineForm
        def={form}
        childNames={childNames}
        onSave={handleSave}
        onCancel={() => setForm(null)}
        saving={saving}
      />
    )
  }

  return (
    <div className="parent-routines-tab">
      <div className="parent-child-tabs">
        {childNames.map(c => (
          <button key={c} className={`parent-child-tab ${activeChild === c ? 'active' : ''}`} onClick={() => setActiveChild(c)}>
            {c}
          </button>
        ))}
      </div>

      <button className="parent-add-chore-btn" onClick={() => setForm(emptyDef(activeChild, childNames))}>
        + Add Routine for {activeChild}
      </button>

      {loading && <p className="parent-soon-msg">Loading…</p>}

      {!loading && childDefs.length === 0 && (
        <p className="parent-soon-msg">
          No routines for {activeChild} yet.
        </p>
      )}

      {!loading && childDefs.map(def => (
        <RoutineRow
          key={def.id}
          def={def}
          confirmDelete={deleteConfirm === def.id}
          onEdit={() => setForm({ ...def })}
          onDeleteRequest={() => setDeleteConfirm(def.id)}
          onConfirmDelete={() => handleDelete(def.id)}
          onCancelDelete={() => setDeleteConfirm(null)}
        />
      ))}
    </div>
  )
}

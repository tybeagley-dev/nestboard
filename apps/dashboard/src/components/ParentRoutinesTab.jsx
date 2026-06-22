import { useState, useEffect } from 'react'
import { useRoutineDefs, adminAddRoutineDef, adminEditRoutineDef, adminDeleteRoutineDef, useScheduleConfig } from '../hooks/useRoutines'
import EmojiPicker from './EmojiPicker'
import { CALCULATED_HOLIDAYS } from '../utils/holidayUtils'

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
          <EmojiPicker value={icon} onChange={setIcon} placeholder="🛏️" />
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

// ── Schedule config section ───────────────────────────────────────────────────

function BreakRow({ brk, onEdit, onDelete, confirmDelete, onConfirmDelete, onCancelDelete }) {
  if (confirmDelete) {
    return (
      <div className="chore-admin-row deleting">
        <span className="chore-delete-msg">Remove "{brk.name}"?</span>
        <button className="chore-delete-yes" onClick={onConfirmDelete}>Remove</button>
        <button className="chore-delete-no"  onClick={onCancelDelete}>Cancel</button>
      </div>
    )
  }
  return (
    <div className="chore-admin-row">
      <div className="chore-admin-info">
        <span className="chore-admin-label">{brk.name}</span>
        <span className="chore-admin-meta">{brk.start} – {brk.end}</span>
      </div>
      <button className="chore-admin-edit-btn" onClick={onEdit}>Edit</button>
      <button className="chore-admin-del-btn"  onClick={onDelete}>×</button>
    </div>
  )
}

function BreakForm({ initial, onSave, onCancel }) {
  const [name,  setName]  = useState(initial?.name  ?? '')
  const [start, setStart] = useState(initial?.start ?? '')
  const [end,   setEnd]   = useState(initial?.end   ?? '')

  function handleSave() {
    if (!name.trim() || !start || !end) return
    onSave({ id: initial?.id ?? crypto.randomUUID(), name: name.trim(), start, end })
  }

  return (
    <div className="sched-break-form">
      <input
        className="chore-form-input"
        placeholder="Break name (e.g. Spring Break)"
        value={name}
        onChange={e => setName(e.target.value)}
        autoFocus
      />
      <div className="sched-date-row">
        <div className="chore-form-field">
          <label className="chore-form-label">Start</label>
          <input type="date" className="chore-form-input" value={start} onChange={e => setStart(e.target.value)} />
        </div>
        <div className="chore-form-field">
          <label className="chore-form-label">End</label>
          <input type="date" className="chore-form-input" value={end} onChange={e => setEnd(e.target.value)} />
        </div>
      </div>
      <div className="chore-form-actions">
        <button className="parent-apply-btn" onClick={handleSave} disabled={!name.trim() || !start || !end}>
          {initial?.id ? 'Save Break' : 'Add Break'}
        </button>
        <button className="btn-cancel-spend" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

function ScheduleConfigSection() {
  const { scheduleConfig, save } = useScheduleConfig()
  const [saving,        setSaving]        = useState(false)
  const [breakForm,     setBreakForm]     = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const summer           = scheduleConfig.summer           ?? { start: '', end: '' }
  const disabledHolidays = scheduleConfig.disabledHolidays ?? []
  const today  = new Date().toLocaleDateString('en-CA')
  const breaks = (scheduleConfig.breaks ?? []).slice().sort((a, b) => {
    const aUp = a.start >= today
    const bUp = b.start >= today
    if (aUp !== bUp) return aUp ? -1 : 1  // upcoming first
    return aUp
      ? a.start.localeCompare(b.start)    // upcoming: ascending
      : b.start.localeCompare(a.start)    // past: most recent first
  })

  const [summerEditing, setSummerEditing] = useState(false)
  const [summerDraft,   setSummerDraft]   = useState({ start: '', end: '' })

  useEffect(() => {
    if (!summerEditing) setSummerDraft(summer)
  }, [summer.start, summer.end]) // eslint-disable-line react-hooks/exhaustive-deps

  async function patchConfig(patch) {
    setSaving(true)
    await save({ summer, disabledHolidays, breaks, ...patch })
    setSaving(false)
  }

  async function handleSummerSave() {
    await patchConfig({ summer: summerDraft })
    setSummerEditing(false)
  }

  function openSummerEdit() {
    setSummerDraft(summer)
    setSummerEditing(true)
  }

  function toggleHoliday(id) {
    const next = disabledHolidays.includes(id)
      ? disabledHolidays.filter(h => h !== id)
      : [...disabledHolidays, id]
    patchConfig({ disabledHolidays: next })
  }

  async function handleBreakSave(brk) {
    const next = breakForm?.id
      ? breaks.map(b => b.id === brk.id ? brk : b)
      : [...breaks, brk]
    await patchConfig({ breaks: next })
    setBreakForm(null)
  }

  async function handleBreakDelete(id) {
    await patchConfig({ breaks: breaks.filter(b => b.id !== id) })
    setDeleteConfirm(null)
  }

  return (
    <div className="sched-config-section">
      <div className="sched-config-divider">Schedule Configuration</div>

      {/* Summer */}
      <div className="sched-config-block">
        <span className="chore-form-label">Summer Break</span>
        {summerEditing ? (
          <div className="sched-break-form">
            <div className="sched-date-row">
              <div className="chore-form-field">
                <label className="chore-form-label">Start</label>
                <input type="date" className="chore-form-input" value={summerDraft.start} onChange={e => setSummerDraft(p => ({ ...p, start: e.target.value }))} autoFocus />
              </div>
              <div className="chore-form-field">
                <label className="chore-form-label">End</label>
                <input type="date" className="chore-form-input" value={summerDraft.end} onChange={e => setSummerDraft(p => ({ ...p, end: e.target.value }))} />
              </div>
            </div>
            <div className="chore-form-actions">
              <button className="parent-apply-btn" onClick={handleSummerSave} disabled={saving || !summerDraft.start || !summerDraft.end}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button className="btn-cancel-spend" onClick={() => setSummerEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : summer.start ? (
          <div className="chore-admin-row">
            <div className="chore-admin-info">
              <span className="chore-admin-label">Summer Break</span>
              <span className="chore-admin-meta">{summer.start} – {summer.end}</span>
            </div>
            <button className="chore-admin-edit-btn" onClick={openSummerEdit}>Edit</button>
          </div>
        ) : (
          <button className="parent-add-chore-btn" onClick={openSummerEdit}>+ Set Summer Dates</button>
        )}
      </div>

      {/* Calculated holidays */}
      <div className="sched-config-block">
        <span className="chore-form-label">Federal / State Holidays</span>
        <p className="chore-form-hint">These are calculated automatically each year. Toggle off any your school doesn't observe.</p>
        <div className="chore-form-days sched-holidays-grid">
          {CALCULATED_HOLIDAYS.map(h => (
            <button
              key={h.id}
              className={`chore-day-chip ${!disabledHolidays.includes(h.id) ? 'active' : ''}`}
              onClick={() => toggleHoliday(h.id)}
              disabled={saving}
            >
              {h.name}
            </button>
          ))}
        </div>
      </div>

      {/* Family breaks */}
      <div className="sched-config-block">
        <span className="chore-form-label">School Breaks</span>
        <p className="chore-form-hint">Add your school's breaks — winter break, spring break, fall break, teacher work days, etc.</p>

        {breaks.map(brk => (
          deleteConfirm === brk.id ? (
            <BreakRow
              key={brk.id}
              brk={brk}
              confirmDelete
              onConfirmDelete={() => handleBreakDelete(brk.id)}
              onCancelDelete={() => setDeleteConfirm(null)}
            />
          ) : breakForm?.id === brk.id ? (
            <BreakForm
              key={brk.id}
              initial={brk}
              onSave={handleBreakSave}
              onCancel={() => setBreakForm(null)}
            />
          ) : (
            <BreakRow
              key={brk.id}
              brk={brk}
              onEdit={() => setBreakForm(brk)}
              onDelete={() => setDeleteConfirm(brk.id)}
            />
          )
        ))}

        {breakForm && !breakForm.id && (
          <BreakForm initial={null} onSave={handleBreakSave} onCancel={() => setBreakForm(null)} />
        )}

        {!breakForm && (
          <button className="parent-add-chore-btn" onClick={() => setBreakForm({})}>
            + Add Break
          </button>
        )}
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
  const [schedFilter,   setSchedFilter]   = useState(SCHEDULES)

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

  const childDefs = defs.filter(d =>
    d.child === activeChild && d.schedules.some(s => schedFilter.includes(s))
  )

  function toggleSchedFilter(s) {
    setSchedFilter(prev =>
      prev.includes(s)
        ? prev.length > 1 ? prev.filter(x => x !== s) : prev  // keep at least one active
        : [...prev, s]
    )
  }

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

      <div className="chore-form-days sched-filter-row">
        {SCHEDULES.map(s => (
          <button
            key={s}
            className={`chore-day-chip ${schedFilter.includes(s) ? 'active' : ''}`}
            onClick={() => toggleSchedFilter(s)}
          >
            {SCHED_LABEL[s]}
          </button>
        ))}
      </div>

      <button className="parent-add-chore-btn" onClick={() => setForm(emptyDef(activeChild, childNames))}>
        + Add Routine for {activeChild}
      </button>

      {loading && <p className="parent-soon-msg">Loading…</p>}

      {!loading && childDefs.length === 0 && (
        <p className="parent-soon-msg">
          {defs.filter(d => d.child === activeChild).length > 0
            ? 'No routines match the selected filters.'
            : `No routines for ${activeChild} yet.`}
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

      <ScheduleConfigSection />
    </div>
  )
}

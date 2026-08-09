import { useState, useEffect } from 'react'
import { useRoutineDefs, adminAddRoutineDef, adminEditRoutineDef, adminDeleteRoutineDef, adminReorderRoutineDefs, useScheduleConfig } from '../hooks/useRoutines'
import EmojiPicker from './EmojiPicker'
import ChildIcon from './ChildIcon'
import TabGuide from './TabGuide'
import { useLabels } from '../FamilyContext'
import { CALCULATED_HOLIDAYS } from '../utils/holidayUtils'

const SCHEDULES   = ['school', 'weekend', 'summer', 'holiday']
const SCHED_LABEL = { school: 'School', weekend: 'Weekend', summer: 'Summer', holiday: 'Holiday' }

// A routine's time of day is what parents actually organize by, so it groups the
// list rather than sitting in the meta line as a glyph.
const TIME_GROUPS = [
  { key: 'morning', title: 'Morning',  icon: '☀️' },
  { key: 'evening', title: 'Evening',  icon: '🌙' },
  { key: '',        title: 'Any time', icon: '🕐' },
]

// Filters are noise on a short list — same threshold the chores tab uses.
const FILTER_BAR_MIN = 6

function emptyDef() {
  return { id: '', childIds: [], label: '', icon: '', schedules: [...SCHEDULES], time: '' }
}

// Empty child_ids means every child. Stale ids (deleted children) are dropped,
// and a routine covering everyone explicitly still reads as "Everyone".
function appliesLabel(def, children) {
  const ids = def.child_ids ?? []
  if (!ids.length) return 'Everyone'
  const names = ids.map(id => children.find(c => c.id === id)?.name).filter(Boolean)
  if (!names.length) return 'No one'
  if (names.length === children.length) return 'Everyone'
  return names.join(' · ')
}

// Only surfaced when it isn't the default all-four — otherwise every row carries
// the same string and the list stops saying anything.
function scheduleNote(schedules) {
  const list = schedules ?? []
  if (!list.length) return 'Never shows'
  if (list.length >= SCHEDULES.length) return null
  return `${list.map(s => SCHED_LABEL[s] ?? s).join(' · ')} only`
}

// ── Routine card ──────────────────────────────────────────────────────────────

function RoutineRow({ def, children, onEdit, onMove, isFirst, isLast, confirmDelete, onDeleteRequest, onConfirmDelete, onCancelDelete }) {
  if (confirmDelete) {
    return (
      <div className="chore-admin-row deleting">
        <span className="chore-delete-msg">Remove "{def.label}"?</span>
        <button className="chore-delete-yes" onClick={onConfirmDelete}>Remove</button>
        <button className="chore-delete-no"  onClick={onCancelDelete}>Cancel</button>
      </div>
    )
  }

  // Whole card opens the editor; the controls inside it stop the click so they
  // don't also fire the edit.
  const stop = e => e.stopPropagation()
  const note = scheduleNote(def.schedules)

  return (
    <div
      className="chore-admin-row chore-admin-row--clickable"
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit() } }}
    >
      <span className="chore-admin-icon">{def.icon || '•'}</span>
      <div className="chore-admin-info">
        <span className="chore-admin-label">{def.label}</span>
        <span className="chore-admin-meta">
          {appliesLabel(def, children)}
          {note && <span className="routine-sched-note"> · {note}</span>}
        </span>
      </div>
      <div className="routine-reorder" onClick={stop}>
        <button className="routine-move-btn" onClick={onMove(-1)} disabled={isFirst} aria-label={`Move ${def.label} up`}>↑</button>
        <button className="routine-move-btn" onClick={onMove(1)}  disabled={isLast}  aria-label={`Move ${def.label} down`}>↓</button>
      </div>
      <button className="chore-admin-del-btn" onClick={e => { stop(e); onDeleteRequest() }} aria-label={`Remove ${def.label}`}>×</button>
    </div>
  )
}

// ── Routine form ──────────────────────────────────────────────────────────────

// Field-by-field reference, collapsed by default. The two non-obvious ones are
// why this exists: "Everyone" is stored as an empty list so later children
// inherit it, and "Which days" means day *types* from the school calendar, not
// days of the week.
function RoutineFieldGuide() {
  return (
    <TabGuide summary="What do these fields do?">
      <p className="onboarding-guide-text">
        <strong>Applies to</strong> — the important one. A routine belongs to the family, not to one
        child, so you write "Brush hair" once and choose who does it. <strong>Everyone</strong> also
        covers children you add later. <strong>Just some</strong> is a fixed list — a new child won't
        be added to it.
      </p>
      <p className="onboarding-guide-text">
        <strong>Time of day</strong> — <em>Morning</em> routines show on the child's card until noon,
        <em> Evening</em> ones from noon onward, and <em>Any time</em> stays up all day. This is also
        what groups the list here.
      </p>
      <p className="onboarding-guide-text">
        <strong>Which days</strong> — day <em>types</em>, not days of the week. All four selected
        means every day, which is what most routines want. Turn some off to limit it — "Pack lunch"
        on School only. Which type today is depends on your <strong>School calendar</strong> below.
        With none selected the routine never appears.
      </p>
      <p className="onboarding-guide-text">
        <strong>Order</strong> — set with the arrows on each card, not in this form. It's the order
        the child sees, and it's shared: one order per time of day, the same for every child.
      </p>
    </TabGuide>
  )
}

function RoutineForm({ def, children, onSave, onCancel, saving }) {
  const [everyone,  setEveryone]  = useState(!(def.childIds?.length))
  const [childIds,  setChildIds]  = useState(def.childIds ?? [])
  const [label,     setLabel]     = useState(def.label || '')
  const [icon,      setIcon]      = useState(def.icon || '')
  const [schedules, setSchedules] = useState(def.schedules?.length ? def.schedules : [...SCHEDULES])
  const [time,      setTime]      = useState(def.time || '')

  function toggleSched(s) {
    setSchedules(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }
  function toggleChild(id) {
    setChildIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  // "Everyone" is the stored empty array, so a family that adds a child later
  // doesn't have to revisit every routine.
  const effectiveIds = everyone ? [] : childIds
  const canSave = label.trim() && (everyone || childIds.length > 0)

  function handleSave() {
    if (!canSave) return
    onSave({ ...def, childIds: effectiveIds, label: label.trim(), icon, schedules, time })
  }

  return (
    <div className="chore-form">
      <RoutineFieldGuide />

      <div className="chore-form-row">
        <div className="chore-form-field">
          <label className="chore-form-label">Routine</label>
          <input className="chore-form-input" value={label} onChange={e => setLabel(e.target.value)} placeholder="Brush hair" autoFocus />
        </div>
        <div className="chore-form-field">
          <label className="chore-form-label">Icon</label>
          <EmojiPicker value={icon} onChange={setIcon} placeholder="🛏️" />
        </div>
      </div>

      <div className="chore-form-field">
        <label className="chore-form-label">Applies to</label>
        <div className="chore-form-toggle">
          <button className={everyone ? 'active' : ''} onClick={() => setEveryone(true)}>Everyone</button>
          <button className={!everyone ? 'active' : ''} onClick={() => setEveryone(false)}>Just some</button>
        </div>
        {!everyone && (
          <>
            <div className="chore-form-days routine-child-chips">
              {children.map(c => (
                <button
                  key={c.id}
                  className={`chore-day-chip ${childIds.includes(c.id) ? 'active' : ''}`}
                  onClick={() => toggleChild(c.id)}
                >
                  <ChildIcon name={c.icon} size={14} color={c.color} style={{ verticalAlign: 'text-bottom' }} /> {c.name}
                </button>
              ))}
            </div>
            <p className="chore-form-hint">Tap each child this routine applies to.</p>
          </>
        )}
        {everyone && <p className="chore-form-hint">Children you add later get this routine too.</p>}
      </div>

      <div className="chore-form-field">
        <label className="chore-form-label">Time of day</label>
        <div className="chore-form-toggle">
          <button className={time === 'morning' ? 'active' : ''} onClick={() => setTime('morning')}>☀️ Morning</button>
          <button className={time === ''        ? 'active' : ''} onClick={() => setTime('')}>🕐 Any time</button>
          <button className={time === 'evening' ? 'active' : ''} onClick={() => setTime('evening')}>🌙 Evening</button>
        </div>
      </div>

      <div className="chore-form-field">
        <label className="chore-form-label">Which days</label>
        <div className="chore-form-days">
          {SCHEDULES.map(s => (
            <button key={s} className={`chore-day-chip ${schedules.includes(s) ? 'active' : ''}`} onClick={() => toggleSched(s)}>
              {SCHED_LABEL[s]}
            </button>
          ))}
        </div>
        <p className="chore-form-hint">
          {schedules.length >= SCHEDULES.length
            ? 'Shows every day. Turn one off to limit it — "Pack lunch" on school days only.'
            : schedules.length === 0
              ? 'With none selected this routine never shows.'
              : 'Only shows on the day types above.'}
        </p>
      </div>

      <div className="chore-form-actions">
        <button className="parent-apply-btn" onClick={handleSave} disabled={saving || !canSave}>
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

  // Collapsed by default — this is family-level calendar config, and it used to
  // dominate a step whose actual job is adding routines.
  return (
    <details className="sched-config-section">
      <summary className="sched-config-summary">
        School calendar
        <span className="sched-config-summary-hint">Summer, holidays and breaks — only needed if you limit routines by day type</span>
      </summary>

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
    </details>
  )
}

// ── Tab root ──────────────────────────────────────────────────────────────────

export default function ParentRoutinesTab({ children }) {
  const labels = useLabels()
  const { defs, loading, reload } = useRoutineDefs()
  const [form,          setForm]          = useState(null)
  const [saving,        setSaving]        = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [childFilter,   setChildFilter]   = useState('')   // '' = all children

  async function handleSave(data) {
    setSaving(true)
    if (data.id) await adminEditRoutineDef(data)
    else         await adminAddRoutineDef(data)
    setSaving(false)
    await reload()
    setForm(null)
  }

  async function handleDelete(id) {
    await adminDeleteRoutineDef(id)
    setDeleteConfirm(null)
    await reload()
  }

  // Reorder within a time group, then persist the whole group's new order.
  async function moveWithin(group, index, delta) {
    const next = [...group]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    await adminReorderRoutineDefs(next.map(d => d.id))
    await reload()
  }

  const visible = defs.filter(d =>
    !childFilter || !d.child_ids?.length || d.child_ids.includes(childFilter)
  )

  if (form !== null) {
    return (
      <RoutineForm
        def={form}
        children={children}
        onSave={handleSave}
        onCancel={() => setForm(null)}
        saving={saving}
      />
    )
  }

  return (
    <div className="parent-routines-tab">
      <TabGuide summary="How routines work">
        <p className="onboarding-guide-text">
          Routines are the same small things every day — brush hair, breakfast, pack lunch. They show
          on each child's card as a checklist, and they reset overnight. Unlike chores they don't earn
          {' '}{labels.tokenName}; they're the baseline you expect, not something to be paid for.
        </p>
        <p className="onboarding-guide-text">
          <strong>A routine belongs to the family, not to a child.</strong> Add "Brush hair" once and
          pick who it applies to — most apply to everyone. Editing it changes it for every child at
          once, and removing it removes it for all of them.
        </p>
        <p className="onboarding-guide-text">
          They're grouped by <strong>Morning</strong>, <strong>Evening</strong> and{' '}
          <strong>Any time</strong>. Morning routines show until noon and evening ones from noon on,
          so a child's card only ever holds what's relevant right now. Use the arrows on a card to
          put them in the order you actually do them — that's the order the child sees.
        </p>
        <p className="onboarding-guide-text">
          A routine can be limited to certain <strong>day types</strong> — school days, weekends,
          summer, holidays — which is how "Pack lunch" stays off on a Saturday. That only works if
          the <strong>School calendar</strong> at the bottom knows your summer dates and school
          breaks. If every routine should run every day, you can ignore it entirely.
        </p>
      </TabGuide>

      <button className="parent-add-chore-btn" onClick={() => setForm(emptyDef())}>
        + Add Routine
      </button>

      {children.length > 1 && defs.length >= FILTER_BAR_MIN && (
        <div className="chore-form-days sched-filter-row">
          <button className={`chore-day-chip ${!childFilter ? 'active' : ''}`} onClick={() => setChildFilter('')}>
            Everyone
          </button>
          {children.map(c => (
            <button
              key={c.id}
              className={`chore-day-chip ${childFilter === c.id ? 'active' : ''}`}
              onClick={() => setChildFilter(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {loading && <p className="parent-soon-msg">Loading…</p>}

      {!loading && defs.length === 0 && (
        <p className="parent-soon-msg">
          No routines yet. Add the things that happen every day — brush hair, breakfast, pack lunch.
        </p>
      )}

      {!loading && defs.length > 0 && visible.length === 0 && (
        <p className="parent-soon-msg">No routines for that child yet.</p>
      )}

      {!loading && TIME_GROUPS.map(group => {
        const rows = visible.filter(d => (d.time || '') === group.key)
        if (!rows.length) return null
        return (
          <div key={group.key} className="routine-group">
            <div className="routine-group-head">
              <span className="routine-group-icon">{group.icon}</span>
              <span className="routine-group-title">{group.title}</span>
            </div>
            {rows.map((def, i) => (
              <RoutineRow
                key={def.id}
                def={def}
                children={children}
                isFirst={i === 0}
                isLast={i === rows.length - 1}
                onMove={delta => e => { e.stopPropagation(); moveWithin(rows, i, delta) }}
                confirmDelete={deleteConfirm === def.id}
                onEdit={() => setForm({ ...def, childIds: def.child_ids ?? [] })}
                onDeleteRequest={() => setDeleteConfirm(def.id)}
                onConfirmDelete={() => handleDelete(def.id)}
                onCancelDelete={() => setDeleteConfirm(null)}
              />
            ))}
          </div>
        )
      })}

      <ScheduleConfigSection />
    </div>
  )
}

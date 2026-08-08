import { useState, useEffect, useCallback } from 'react'
import { adminGetAllChores, adminAddChore, adminEditChore, adminDeleteChore } from '../hooks/useChores'
import ChildIcon from './ChildIcon'
import EmojiPicker from './EmojiPicker'
import TabGuide from './TabGuide'
import { apiGet, apiPost, apiDelete } from '../utils/api'
import { unassignChore, triggerChoreRefetch } from '../hooks/useAssignedChores'
import { getTodayKey } from '../utils/dateUtils'
import { useScheduleConfig } from '../hooks/useRoutines'
import { useLabels } from '../FamilyContext'
import TokenBadge from './TokenBadge'

const WEEKDAYS = [
  { n: 0, label: 'S' }, { n: 1, label: 'M' }, { n: 2, label: 'T' },
  { n: 3, label: 'W' }, { n: 4, label: 'T' }, { n: 5, label: 'F' }, { n: 6, label: 'S' },
]

// Which weekdays the chore spinner is available. Stored in schedule_config.spinDays;
// undefined = every day. Surfaced here so families control when chores can be spun.
function SpinDaysPicker() {
  const { scheduleConfig, save } = useScheduleConfig()
  const spinDays = Array.isArray(scheduleConfig.spinDays) ? scheduleConfig.spinDays : [0, 1, 2, 3, 4, 5, 6]
  const [saving, setSaving] = useState(false)

  async function toggle(n) {
    const next = spinDays.includes(n)
      ? spinDays.filter(d => d !== n)
      : [...spinDays, n].sort((a, b) => a - b)
    setSaving(true)
    await save({ ...scheduleConfig, spinDays: next })
    setSaving(false)
  }

  return (
    <div className="spin-days-picker">
      <span className="spin-days-label">Chores can be spun on</span>
      <div className="spin-days-row">
        {WEEKDAYS.map((d, idx) => (
          <button
            key={idx}
            className={`chore-day-chip ${spinDays.includes(d.n) ? 'active' : ''}`}
            onClick={() => toggle(d.n)}
            disabled={saving}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  )
}

const DAYS      = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_SHORT = { Sunday: 'Sun', Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat' }

function emptyChore() {
  return { id: '', label: '', icon: '', tokens: 1, active: true, days: [], frequency: 'daily', required: false, instructions: [] }
}

// ── Chore row in list view ────────────────────────────────────────────────────

function ChoreRow({ chore, children, onEdit, onSetActive }) {
  const [assigning, setAssigning] = useState(false)
  const [assigned,  setAssigned]  = useState('')
  const isInactive = chore.active === false

  async function handleAssign(child) {
    await apiPost(`/chores/${chore.id}/accept`, {
      child:      child.name,
      choreLabel: chore.label,
      tokens:      chore.tokens,
    })
    setAssigned(child.name)
    setAssigning(false)
    setTimeout(() => setAssigned(''), 2000)
    triggerChoreRefetch()
  }

  // Whole row opens the editor; the controls inside it stop the click so they
  // don't also fire the edit.
  const stop = e => e.stopPropagation()

  return (
    <div
      className={`chore-admin-row chore-admin-row--clickable ${chore.active === false ? 'chore-admin-row--inactive' : ''}`}
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit() } }}
    >
      <span className="chore-admin-icon">{chore.icon || '•'}</span>
      <div className="chore-admin-info">
        <span className="chore-admin-label">
          {chore.label}
          {chore.active === false && <span className="chore-inactive-badge"> inactive</span>}
        </span>
        <span className="chore-admin-meta">
          {chore.days.length ? chore.days.map(d => DAY_SHORT[d] ?? d).join(' · ') : 'Any day'}
          {chore.required && ' · Required'}
          {chore.required && chore.child_ids?.length > 0 &&
            ` · ${chore.child_ids.map(id => children.find(c => c.id === id)?.name ?? '?').join(', ')} only`}
          {chore.frequency === 'weekly' && ' · Weekly'}
        </span>
        {assigning && (
          <div className="chore-assign-picker" onClick={stop}>
            {children.map(child => (
              <button key={child.name} className="chore-assign-child-btn" onClick={() => handleAssign(child)}>
                <ChildIcon name={child.icon} size={15} color={child.color} style={{ verticalAlign: 'text-bottom' }} /> {child.name}
              </button>
            ))}
            <button className="chore-assign-cancel" onClick={() => setAssigning(false)}>Cancel</button>
          </div>
        )}
        {assigned && <span className="chore-assign-confirm">Assigned to {assigned} ✓</span>}
      </div>
      <TokenBadge amount={chore.tokens} />
      {isInactive ? (
        <button
          className="chore-assign-btn"
          onClick={e => { stop(e); onSetActive(true) }}
          title="Put this chore back in rotation"
        >
          Restore
        </button>
      ) : (
        <>
          {!assigning && !assigned && (
            <button
              className="chore-assign-btn"
              onClick={e => { stop(e); setAssigning(true) }}
              title="Assign this chore to a child now"
            >
              Assign
            </button>
          )}
          <button
            className="chore-admin-del-btn"
            onClick={e => { stop(e); onSetActive(false) }}
            title="Retire — moves to Inactive, doesn't delete"
            aria-label={`Retire ${chore.label}`}
          >×</button>
        </>
      )}
    </div>
  )
}

// ── Add / Edit form ───────────────────────────────────────────────────────────

// Field-by-field reference, collapsed by default. Two things here are genuinely
// non-obvious and are the reason this exists: Required chores skip the spinner
// entirely, and `days` means "only these days" for spin chores but "from this
// day until it's done" for required ones (useAssignedChores.choreStartedThisWeek).
function ChoreFieldGuide() {
  const labels = useLabels()
  const tokens = labels.tokenName.toLowerCase()
  return (
    <TabGuide summary="What do these fields do?">
      <p className="onboarding-guide-text">
        <strong>{labels.tokenName}</strong> — what finishing it earns, and how much of the daily
        target it covers. Keep everyday jobs at 1 and give longer or nastier ones more.
      </p>
      <p className="onboarding-guide-text">
        <strong>Required</strong> — the big one. A required chore is assigned automatically and
        appears on the child's card every day until it's done. A chore that is <em>not</em> required
        only ever shows up if the child lands on it in the <strong>chore spinner</strong>.
      </p>
      <p className="onboarding-guide-text">
        <strong>Days</strong> — for spinner chores, the only days it can be spun. For
        {' '}<em>required</em> chores it's a start day instead: the chore appears from that day
        onward and stays until it's finished, so setting Monday means it sits there all week.
        Leave blank for every day.
      </p>
      <p className="onboarding-guide-text">
        <strong>Frequency</strong> — <em>Daily</em> can come up again and again.
        {' '}<em>Weekly</em> means once per week: a required weekly chore disappears for that child
        once they finish it, and a weekly spinner chore leaves the pool for
        {' '}<em>everyone</em> once any child does it.
      </p>
      <p className="onboarding-guide-text">
        <strong>Assign to</strong> (required chores only) — pick specific children, or leave it empty
        to give it to all of them.
      </p>
      <p className="onboarding-guide-text">
        <strong>Steps</strong> — an optional checklist shown to the child when they open the chore.
        Good for anything with a "did you also…" attached to it.
      </p>
      <p className="onboarding-guide-text">
        <strong>Status</strong> — set a chore Inactive to retire it without deleting it or losing
        the {tokens} history. It stops being assigned or spun.
      </p>
    </TabGuide>
  )
}

function ChoreForm({ chore, children = [], onSave, onCancel, onDelete, saving }) {
  const labels = useLabels()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [label,        setLabel]        = useState(chore.label || '')
  const [icon,         setIcon]         = useState(chore.icon || '')
  const [tokens,        setTokens]        = useState(chore.tokens || 1)
  const [active,       setActive]       = useState(chore.active !== false)
  const [days,         setDays]         = useState(chore.days || [])
  const [frequency,    setFrequency]    = useState(chore.frequency || 'daily')
  const [required,     setRequired]     = useState(chore.required || false)
  const [childIds,     setChildIds]     = useState(chore.child_ids || [])
  const [instructions, setInstructions] = useState(
    chore.instructions?.length ? chore.instructions : []
  )

  function toggleDay(day) {
    setDays(d => d.includes(day) ? d.filter(x => x !== day) : [...d, day])
  }

  function toggleChild(id) {
    setChildIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])
  }

  function setInstruction(i, val) {
    setInstructions(ins => ins.map((s, j) => j === i ? val : s))
  }

  function removeInstruction(i) {
    setInstructions(ins => ins.filter((_, j) => j !== i))
  }

  function handleSave() {
    if (!label.trim()) return
    onSave({ ...chore, label: label.trim(), icon, tokens, active, days, frequency, required, instructions, child_ids: required ? childIds : [] })
  }

  return (
    <div className="chore-form">
      <ChoreFieldGuide />

      <div className="chore-form-field">
        <label className="chore-form-label">Label</label>
        <input
          className="chore-form-input"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="Clean bathroom"
          autoFocus
        />
      </div>

      <div className="chore-form-row">
        <div className="chore-form-field">
          <label className="chore-form-label">Icon</label>
          <EmojiPicker value={icon} onChange={setIcon} placeholder="🚿" />
        </div>
        <div className="chore-form-field">
          <label className="chore-form-label">
            {labels.tokenName} <span className="chore-form-hint">— what it's worth</span>
          </label>
          <input
            className="chore-form-input chore-form-tokens"
            type="number" min="1" step="1"
            value={tokens}
            onChange={e => setTokens(Math.max(1, parseInt(e.target.value || '1', 10)))}
          />
        </div>
      </div>

      <div className="chore-form-field">
        <label className="chore-form-label">
          Days <span className="chore-form-hint">
            — {required ? 'starts this day, stays until done' : 'spinnable on these days'}; blank = any day
          </span>
        </label>
        <div className="chore-form-days">
          {DAYS.map(d => (
            <button
              key={d}
              className={`chore-day-chip ${days.includes(d) ? 'active' : ''}`}
              onClick={() => toggleDay(d)}
            >
              {DAY_SHORT[d]}
            </button>
          ))}
        </div>
      </div>

      <div className="chore-form-row">
        <div className="chore-form-field">
          <label className="chore-form-label">Frequency</label>
          <div className="chore-form-toggle">
            <button className={frequency === 'daily'  ? 'active' : ''} onClick={() => setFrequency('daily')}>Daily</button>
            <button className={frequency === 'weekly' ? 'active' : ''} onClick={() => setFrequency('weekly')}>Weekly</button>
          </div>
        </div>
        <div className="chore-form-field">
          <label className="chore-form-label">Required</label>
          <button
            className={`chore-form-toggle-single ${required ? 'active' : ''}`}
            onClick={() => setRequired(r => !r)}
          >
            {required ? 'Yes — auto-adds' : 'No — spin only'}
          </button>
        </div>

        {required && children.length > 0 && (
          <div className="chore-form-field chore-form-assign">
            <label className="chore-form-label">Assign to <span className="chore-form-hint">— none = all children</span></label>
            <div className="chore-form-days">
              {children.map(c => (
                <button
                  key={c.id}
                  className={`chore-day-chip ${childIds.includes(c.id) ? 'active' : ''}`}
                  onClick={() => toggleChild(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {chore.id && (
        <div className="chore-form-field">
          <label className="chore-form-label">Status</label>
          <button
            className={`chore-form-toggle-single ${active ? 'active' : ''}`}
            onClick={() => setActive(a => !a)}
          >
            {active ? 'Active — shows on wheel' : 'Inactive — hidden from wheel'}
          </button>
        </div>
      )}

      <div className="chore-form-field">
        <label className="chore-form-label">Steps <span className="chore-form-hint">— optional instructions shown to children</span></label>
        {instructions.map((step, i) => (
          <div key={i} className="chore-step-row">
            <input
              className="chore-form-input"
              value={step}
              onChange={e => setInstruction(i, e.target.value)}
              placeholder={`Step ${i + 1}`}
            />
            <button className="chore-step-remove" onClick={() => removeInstruction(i)}>×</button>
          </div>
        ))}
        <button className="chore-step-add" onClick={() => setInstructions(ins => [...ins, ''])}>
          + Add step
        </button>
      </div>

      <div className="chore-form-actions">
        <button
          className="parent-apply-btn"
          onClick={handleSave}
          disabled={saving || !label.trim()}
        >
          {saving ? 'Saving…' : (chore.id ? 'Save Changes' : 'Add Chore')}
        </button>
        <button className="btn-cancel-spend" onClick={onCancel}>Cancel</button>
      </div>

      {onDelete && (
        <div className="chore-form-danger">
          {confirmingDelete ? (
            <>
              <p className="chore-form-hint">
                Delete "{chore.label}" for good? Retiring it instead keeps it out of rotation
                without touching anything.
              </p>
              <div className="chore-form-danger-actions">
                <button className="chore-delete-yes" onClick={onDelete}>Delete permanently</button>
                <button className="chore-delete-no" onClick={() => setConfirmingDelete(false)}>Cancel</button>
              </div>
            </>
          ) : (
            <button className="chore-form-delete-btn" onClick={() => setConfirmingDelete(true)}>
              Delete chore
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Today's Assignments ───────────────────────────────────────────────────────

function TodayAssignments({ children }) {
  const [assignments, setAssignments] = useState([])
  const [acting,      setActing]      = useState(null)

  const load = useCallback(async () => {
    const today = getTodayKey(new Date())
    const data  = await apiGet(`/chores/state?date=${today}`)
    if (!data?.today) return
    const flat = []
    for (const [childName, chores] of Object.entries(data.today)) {
      const childObj = children.find(c => c.name === childName)
      for (const [choreId, entry] of Object.entries(chores)) {
        if (entry.status === 'accepted') {
          flat.push({
            child: childName, childObj, choreId,
            choreLabel: entry.choreLabel,
            tokens: entry.tokens,
            isBonus: entry.isBonus === true,
          })
        }
      }
    }
    setAssignments(flat)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    window.addEventListener('fam_refetch_chores', load)
    return () => window.removeEventListener('fam_refetch_chores', load)
  }, [load])

  async function handleUnassign(item) {
    setActing(`${item.child}-${item.choreId}`)
    await apiDelete(`/chores/${item.choreId}/assignment?child=${encodeURIComponent(item.child)}`)
    unassignChore(item.child, item.choreId)
    triggerChoreRefetch()
    await load()
    setActing(null)
  }

  if (assignments.length === 0) return null

  return (
    <div className="today-assignments">
      <p className="chore-inactive-heading">Assigned Today</p>
      {assignments.map(item => {
        const key  = `${item.child}-${item.choreId}`
        const busy = acting === key
        return (
          <div key={key} className="approval-row">
            <div className="approval-info">
              {item.childObj && (
                <span className="approval-avatar" style={{ background: item.childObj.color }}>
                  <ChildIcon name={item.childObj.icon} size={16} />
                </span>
              )}
              <div className="approval-meta">
                <span className="approval-child">{item.child}</span>
                <span className="approval-label">
                  {item.choreLabel}
                  {item.isBonus && <span className="bonus-tag">bonus</span>}
                </span>
              </div>
              <TokenBadge amount={item.tokens} />
            </div>
            <div className="approval-actions">
              <button
                className="approval-btn reject"
                onClick={() => handleUnassign(item)}
                disabled={busy}
              >
                {busy ? '…' : 'Unassign'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Filtering ─────────────────────────────────────────────────────────────────

// Below this many chores the bar is more clutter than help, so it stays hidden.
const FILTER_BAR_MIN = 6

const EMPTY_FILTERS = { assign: null, frequency: null, tokens: null }

function choreMatches(chore, search, f) {
  if (search && !chore.label.toLowerCase().includes(search.toLowerCase())) return false
  if (f.assign === 'required' && !chore.required) return false
  if (f.assign === 'spin'     &&  chore.required) return false
  // Chores saved before the frequency field default to daily.
  if (f.frequency && (chore.frequency ?? 'daily') !== f.frequency) return false
  if (f.tokens && (chore.tokens ?? 1) !== f.tokens) return false
  return true
}

function ChoreFilterBar({ search, onSearch, filters, onChange, shown, total, tokenValues }) {
  const active = search || filters.assign || filters.frequency || filters.tokens
  // Tapping the selected chip clears that facet.
  const set = (key, val) => onChange({ ...filters, [key]: filters[key] === val ? null : val })
  const chip = (key, val, label) => (
    <button
      key={`${key}-${val}`}
      className={`chore-day-chip ${filters[key] === val ? 'active' : ''}`}
      onClick={() => set(key, val)}
    >
      {label}
    </button>
  )

  return (
    <div className="chore-filter-bar">
      <input
        className="chore-form-input chore-filter-search"
        value={search}
        onChange={e => onSearch(e.target.value)}
        placeholder="Search chores…"
      />
      <div className="chore-filter-chips">
        {chip('assign', 'required', 'Required')}
        {chip('assign', 'spin', 'Spinner')}
        <span className="chore-filter-sep" />
        {chip('frequency', 'daily', 'Daily')}
        {chip('frequency', 'weekly', 'Weekly')}
        {tokenValues.length > 1 && <span className="chore-filter-sep" />}
        {tokenValues.length > 1 && tokenValues.map(v => chip('tokens', v, `${v}`))}
      </div>
      {active && (
        <div className="chore-filter-status">
          <span>{shown} of {total} shown</span>
          <button
            className="chore-filter-clear"
            onClick={() => { onSearch(''); onChange(EMPTY_FILTERS) }}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}

// ── Tab root ──────────────────────────────────────────────────────────────────

export default function ParentChoresTab({ children = [] }) {
  const labels = useLabels()
  const [chores,        setChores]        = useState([])
  const [loading,       setLoading]       = useState(true)
  const [form,          setForm]          = useState(null)
  const [saving,        setSaving]        = useState(false)
  const [search,        setSearch]        = useState('')
  const [filters,       setFilters]       = useState(EMPTY_FILTERS)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await adminGetAllChores()
    setChores(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave(data) {
    setSaving(true)
    if (data.id) await adminEditChore(data)
    else         await adminAddChore(data)
    setSaving(false)
    await load()
    setForm(null)
  }

  async function handleDelete(id) {
    await adminDeleteChore(id)
    await load()
    setForm(null)
  }

  // Retire / restore. Goes through the same edit endpoint as the form, so the
  // chore keeps its id and its history stays attached.
  async function handleSetActive(chore, active) {
    setChores(cs => cs.map(c => (c.id === chore.id ? { ...c, active } : c)))
    await adminEditChore({ ...chore, active })
    await load()
  }

  if (form !== null) {
    return (
      <ChoreForm
        chore={form}
        children={children}
        onSave={handleSave}
        onCancel={() => setForm(null)}
        onDelete={form.id ? () => handleDelete(form.id) : null}
        saving={saving}
      />
    )
  }

  // Token values are family-defined now, so the filter chips come from the data
  // rather than a hardcoded 1/2.
  const tokenValues = [...new Set(chores.map(c => c.tokens ?? 1))].sort((a, b) => a - b)
  const visible  = chores.filter(c => choreMatches(c, search, filters))
  const active   = visible.filter(c => c.active !== false)
  const inactive = visible.filter(c => c.active === false)

  return (
    <div className="parent-chores-tab">
      <TabGuide summary="How chores & tokens work">
        <p className="onboarding-guide-text">
          Add chores here, then children spin the <strong>chore spinner</strong> on their card to get
          assigned one. Finishing a chore earns {labels.tokenName}, which cash in at the {labels.rewardsName}.
        </p>
        <p className="onboarding-guide-text">
          <strong>Spin days</strong> control which days the spinner is live — set it to weekdays only,
          weekends, or whatever fits. <strong>Sub-tasks</strong> break a multi-part chore into a
          checklist so nothing gets missed.
        </p>
        <p className="onboarding-guide-text">
          <strong>Every active chore that isn't Required is in the spinner pool</strong> — that's
          what Active means. Retiring a chore (the × on its row) moves it to Inactive and pulls it
          out of the pool without deleting it or its history. Required chores are never spun; they're
          assigned directly.
        </p>
        <p className="onboarding-guide-text">
          A chore's value is how much of the daily target it covers. Keep everyday jobs at 1 and
          give a longer or nastier one more — one big chore can fill a whole day on its own.
        </p>
        <p className="onboarding-guide-text">
          <strong>One spin is a day's work.</strong> A spin fills up to your family's daily target
          (set it under Settings → Family → Features), so a 2-{labels.tokenNameSingular} chore
          arrives on its own while a 1-{labels.tokenNameSingular} chore brings a second along. Both
          options offered after a spin are worth the same, so there's no wrong pick.
        </p>
      </TabGuide>

      <TodayAssignments children={children} />

      <SpinDaysPicker />

      <button className="parent-add-chore-btn" onClick={() => setForm(emptyChore())}>
        + Add Chore
      </button>

      {loading && <p className="parent-soon-msg">Loading chores…</p>}

      {!loading && chores.length >= FILTER_BAR_MIN && (
        <ChoreFilterBar
          search={search}
          onSearch={setSearch}
          filters={filters}
          onChange={setFilters}
          shown={visible.length}
          total={chores.length}
          tokenValues={tokenValues}
        />
      )}

      {!loading && chores.length === 0 && (
        <p className="parent-soon-msg">No chores yet. Add one above.</p>
      )}

      {!loading && chores.length > 0 && visible.length === 0 && (
        <p className="parent-soon-msg">No chores match those filters.</p>
      )}

      {!loading && active.map(chore => (
        <ChoreRow
          key={chore.id}
          chore={chore}
          children={children}
          onEdit={() => setForm({ ...chore, instructions: chore.instructions ?? [] })}
          onSetActive={active => handleSetActive(chore, active)}
        />
      ))}

      {!loading && inactive.length > 0 && (
        <>
          <p className="chore-inactive-heading">Inactive</p>
          {inactive.map(chore => (
            <ChoreRow
              key={chore.id}
              chore={chore}
              children={children}
              onEdit={() => setForm({ ...chore, instructions: chore.instructions ?? [] })}
              onSetActive={active => handleSetActive(chore, active)}
            />
          ))}
        </>
      )}
    </div>
  )
}

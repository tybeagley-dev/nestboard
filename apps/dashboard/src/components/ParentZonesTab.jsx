import { useState, useEffect, useCallback, useRef } from 'react'
import {
  useZoneDefs,
  adminAddZone, adminEditZone, adminDeleteZone,
  adminAddMicroZone, adminEditMicroZone, adminDeleteMicroZone,
  adminUpdateAssignment, adminAddManualAssignment, adminDeleteAssignment,
} from '../hooks/useZone'
import ChildIcon from './ChildIcon'
import EmojiPicker from './EmojiPicker'
import TabGuide from './TabGuide'
import { apiGet } from '../utils/api'
import { getTodayKey } from '../utils/dateUtils'

// ── Micro-zone picker ─────────────────────────────────────────────────────────

function MicroZonePicker({ defs, onPick, onCancel }) {
  return (
    <div className="zone-picker">
      {defs.map(zone => {
        const active = zone.micro_zones.filter(mz => mz.active)
        if (active.length === 0) return null
        return (
          <div key={zone.id} className="zone-picker-group">
            <div className="zone-picker-zone-label">{zone.icon} {zone.label}</div>
            {active.map(mz => (
              <button key={mz.id} className="zone-picker-item" onClick={() => onPick(mz.id)}>
                {mz.label}
              </button>
            ))}
          </div>
        )
      })}
      <button className="btn-cancel-spend" style={{ marginTop: 8 }} onClick={onCancel}>Cancel</button>
    </div>
  )
}

// ── This week assignments ─────────────────────────────────────────────────────

// Names the assignment being replaced ("Kitchen · wipe the counter") so the
// picker can say what it is about to overwrite.
function pickChange(assignment, child) {
  return {
    mode:      'change',
    id:        assignment.id,
    childName: child.name,
    current:   `${assignment.zone_label} · ${assignment.micro_zone_label}`,
  }
}

function ThisWeek({ children, defs, onChanged }) {
  const [assignments, setAssignments] = useState([])
  const [loading,     setLoading]     = useState(true)
  // null, or what the picker is currently doing:
  //   { mode: 'change', id, childName, current }  — replace an existing assignment
  //   { mode: 'new',    childId, childName }      — add one on top of the auto pick
  const [picking, setPicking] = useState(null)

  const load = useCallback(async () => {
    const today = getTodayKey(new Date())
    const data = await apiGet(`/zones/assignments?date=${today}`)
    setAssignments(data?.assignments ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleUpdateAssignment(assignmentId, microZoneId) {
    await adminUpdateAssignment(assignmentId, microZoneId)
    setPicking(null)
    await load()
    onChanged()
  }

  async function handleAddAssignment(childId, microZoneId) {
    const today = getTodayKey(new Date())
    await adminAddManualAssignment({ child_id: childId, micro_zone_id: microZoneId, date: today })
    setPicking(null)
    await load()
    onChanged()
  }

  async function handleDelete(assignmentId) {
    await adminDeleteAssignment(assignmentId)
    await load()
    onChanged()
  }

  if (loading) return <p className="parent-soon-msg">Loading…</p>

  return (
    <div>
      {picking && (
        <div className="zone-picker-backdrop" onClick={() => setPicking(null)}>
          <div className="zone-picker-modal" onClick={e => e.stopPropagation()}>
            {picking.mode === 'change' ? (
              <>
                <p className="zone-picker-title">Change {picking.childName}’s micro-zone</p>
                <p className="zone-picker-sub">
                  Currently {picking.current}. Pick what replaces it for the rest of the week.
                </p>
              </>
            ) : (
              <>
                <p className="zone-picker-title">Give {picking.childName} another micro-zone</p>
                <p className="zone-picker-sub">
                  An extra job on top of the one they were assigned automatically this week.
                </p>
              </>
            )}
            <MicroZonePicker
              defs={defs}
              onPick={microZoneId => {
                if (picking.mode === 'new') handleAddAssignment(picking.childId, microZoneId)
                else                        handleUpdateAssignment(picking.id, microZoneId)
              }}
              onCancel={() => setPicking(null)}
            />
          </div>
        </div>
      )}

      {children.map(child => {
        const childAssignments = assignments.filter(a => a.child_id === child.id)
        const auto   = childAssignments.find(a => a.is_auto)
        const manual = childAssignments.filter(a => !a.is_auto)

        return (
          <div key={child.id} className="zone-week-child">
            <div className="zone-week-child-name" style={{ color: child.color }}>
              <ChildIcon name={child.icon} size={15} color={child.color} style={{ verticalAlign: 'text-bottom' }} /> {child.name}
            </div>

            {auto ? (
              <div
                className="chore-admin-row chore-admin-row--clickable"
                role="button"
                tabIndex={0}
                onClick={() => setPicking(pickChange(auto, child))}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPicking(pickChange(auto, child)) } }}
              >
                <div className="chore-admin-info">
                  <span className="chore-admin-label">{auto.micro_zone_label}</span>
                  <span className="chore-admin-meta">{auto.zone_icon} {auto.zone_label} · auto</span>
                </div>
              </div>
            ) : (
              <p className="parent-soon-msg" style={{ fontSize: 12, padding: '4px 0' }}>No auto assignment yet</p>
            )}

            {manual.map(a => (
              <div
                key={a.id}
                className="chore-admin-row chore-admin-row--clickable"
                style={{ paddingLeft: 12 }}
                role="button"
                tabIndex={0}
                onClick={() => setPicking(pickChange(a, child))}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPicking(pickChange(a, child)) } }}
              >
                <div className="chore-admin-info">
                  <span className="chore-admin-label">{a.micro_zone_label}</span>
                  <span className="chore-admin-meta">{a.zone_icon} {a.zone_label} · added</span>
                </div>
                <button
                  className="chore-admin-del-btn"
                  onClick={e => { e.stopPropagation(); handleDelete(a.id) }}
                  aria-label={`Remove ${a.micro_zone_label}`}
                >×</button>
              </div>
            ))}

            <button
              className="chore-admin-row"
              style={{ color: 'var(--accent-warm)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 12 }}
              onClick={() => setPicking({ mode: 'new', childId: child.id, childName: child.name })}
            >
              + Assign additional micro-zone for {child.name}
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ── Zone row ──────────────────────────────────────────────────────────────────

function ZoneRow({ zone, children, onEdit, confirmDelete, onDeleteRequest, onConfirmDelete, onCancelDelete }) {
  const eligibleNames = zone.eligible_child_ids.length > 0
    ? children.filter(c => zone.eligible_child_ids.includes(c.id)).map(c => c.name).join(', ')
    : 'All children'

  if (confirmDelete) {
    return (
      <div className="chore-admin-row deleting">
        <span className="chore-delete-msg">Remove "{zone.label}"?</span>
        <button className="chore-delete-yes" onClick={onConfirmDelete}>Remove</button>
        <button className="chore-delete-no"  onClick={onCancelDelete}>Cancel</button>
      </div>
    )
  }

  return (
    <div
      className="chore-admin-row chore-admin-row--clickable"
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit() } }}
    >
      <span className="chore-admin-icon">{zone.icon || '📍'}</span>
      <div className="chore-admin-info">
        <span className="chore-admin-label">{zone.label}</span>
        <span className="chore-admin-meta">{eligibleNames} · {zone.micro_zones.length} micro-zone{zone.micro_zones.length !== 1 ? 's' : ''}</span>
      </div>
      <button
        className="chore-admin-del-btn"
        onClick={e => { e.stopPropagation(); onDeleteRequest() }}
        aria-label={`Remove ${zone.label}`}
      >×</button>
    </div>
  )
}

// ── Zone form ─────────────────────────────────────────────────────────────────

// One editor for the whole zone: name, icon, eligibility, and the micro-zones
// inside it. Micro-zones used to be a separate inline flow that wrote to the API
// on every keystroke-save, which meant Cancel here discarded the rename but kept
// the micro-zone you had just added. They are staged in local state now and
// committed together, so Cancel means cancel.
//
// `key` is the identity used while editing: a real micro_zone id, or `new-<n>`
// for one that doesn't exist server-side yet.
function ZoneForm({ zone, children, onSave, onCancel, saving }) {
  const [label,    setLabel]    = useState(zone?.label ?? '')
  const [icon,     setIcon]     = useState(zone?.icon ?? '')
  const [eligible, setEligible] = useState(zone?.eligible_child_ids ?? [])
  const [micros,   setMicros]   = useState(() =>
    (zone?.micro_zones ?? []).map(mz => ({ key: mz.id, id: mz.id, label: mz.label, active: mz.active }))
  )
  const [newLabel, setNewLabel] = useState('')
  const [confirmRemove, setConfirmRemove] = useState(null)
  const nextKey = useRef(0)

  function toggleEligible(id) {
    setEligible(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function addMicro() {
    if (!newLabel.trim()) return
    setMicros(prev => [...prev, { key: `new-${nextKey.current++}`, id: null, label: newLabel.trim(), active: true }])
    setNewLabel('')
  }

  function patchMicro(key, patch) {
    setMicros(prev => prev.map(m => m.key === key ? { ...m, ...patch } : m))
  }

  function removeMicro(key) {
    setMicros(prev => prev.filter(m => m.key !== key))
    setConfirmRemove(null)
  }

  // Only an existing micro-zone is worth confirming: zone_assignments cascades on
  // its delete, so removing one takes this week's assignment and its check history
  // with it. A row added in this session has none of that behind it yet.
  function requestRemove(m) {
    if (m.id) setConfirmRemove(m.key)
    else      removeMicro(m.key)
  }

  function handleSave() {
    if (!label.trim()) return
    onSave(
      { ...zone, label: label.trim(), icon, eligible_child_ids: eligible },
      micros.filter(m => m.label.trim()).map((m, i) => ({ ...m, label: m.label.trim(), sort_order: i })),
    )
  }

  return (
    <div className="chore-form">
      <div className="chore-form-row">
        <div className="chore-form-field">
          <label className="chore-form-label">Zone (an area of your home)</label>
          <input className="chore-form-input" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Kitchen, Bathroom, TV Room" autoFocus />
        </div>
        <div className="chore-form-field">
          <label className="chore-form-label">Icon</label>
          <EmojiPicker value={icon} onChange={setIcon} placeholder="📺" />
        </div>
      </div>

      <div className="chore-form-field">
        <label className="chore-form-label">Eligible children (empty = all)</label>
        <div className="chore-form-toggle">
          {children.map(c => (
            <button
              key={c.id}
              className={eligible.includes(c.id) ? 'active' : ''}
              onClick={() => toggleEligible(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="chore-form-field">
        <label className="chore-form-label">Micro-zones</label>
        <p className="chore-form-hint">
          The small weekly jobs inside this zone — “wipe the counter”, “hang up the coats”.
          One is handed to a child each week. Turn one off to keep it out of the rotation
          without losing it.
        </p>

        {micros.map(m => confirmRemove === m.key ? (
          <div key={m.key} className="zone-micro-edit-row zone-micro-edit-row--confirm">
            <span className="chore-delete-msg">
              Remove “{m.label}”? Anyone assigned it this week loses it, along with their check-ins.
            </span>
            <button className="chore-delete-yes" onClick={() => removeMicro(m.key)}>Remove</button>
            <button className="chore-delete-no"  onClick={() => setConfirmRemove(null)}>Keep</button>
          </div>
        ) : (
          <div key={m.key} className="zone-micro-edit-row">
            <input
              className="chore-form-input"
              value={m.label}
              onChange={e => patchMicro(m.key, { label: e.target.value })}
              placeholder="Micro-zone label"
            />
            <button
              className={`zone-micro-active-btn ${m.active ? 'active' : ''}`}
              onClick={() => patchMicro(m.key, { active: !m.active })}
              title={m.active ? 'In the weekly rotation' : 'Not in the rotation'}
            >
              {m.active ? 'Active' : 'Inactive'}
            </button>
            <button
              className="chore-admin-del-btn"
              onClick={() => requestRemove(m)}
              aria-label={`Remove ${m.label || 'micro-zone'}`}
            >×</button>
          </div>
        ))}

        <div className="zone-micro-edit-row">
          <input
            className="chore-form-input"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            placeholder="Add a micro-zone…"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMicro() } }}
          />
          <button className="chore-step-add" onClick={addMicro} disabled={!newLabel.trim()}>+ Add</button>
        </div>
      </div>

      <div className="chore-form-actions">
        <button className="parent-apply-btn" onClick={handleSave} disabled={saving || !label.trim()}>
          {saving ? 'Saving…' : zone?.id ? 'Save Changes' : 'Add Zone'}
        </button>
        <button className="btn-cancel-spend" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ── Tab root ──────────────────────────────────────────────────────────────────

export default function ParentZonesTab({ children }) {
  const { defs, loading, reload } = useZoneDefs()
  const [view,          setView]          = useState('week') // 'week' | 'defs'
  const [form,          setForm]          = useState(null)
  const [saving,        setSaving]        = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [autoRouted,    setAutoRouted]    = useState(false)

  // First-run (no zones yet) lands on Zone Definitions — where setup happens —
  // instead of the empty "This Week". Only nudges once; never fights the user.
  useEffect(() => {
    if (!autoRouted && !loading) {
      if (defs.length === 0) setView('defs')
      setAutoRouted(true)
    }
  }, [autoRouted, loading, defs.length])

  // Commits the zone, then reconciles its micro-zones against what was there
  // when the form opened: rows that vanished are deleted, rows without an id are
  // created, and the rest are updated only when something actually changed.
  // A new zone has to be created first — its micro-zones need the returned id.
  async function handleSave(data, micros) {
    setSaving(true)
    let zoneId = data.id
    if (zoneId) await adminEditZone(zoneId, data)
    else        zoneId = (await adminAddZone(data))?.id

    if (zoneId) {
      const before = defs.find(z => z.id === zoneId)?.micro_zones ?? []
      const keptIds = new Set(micros.map(m => m.id).filter(Boolean))
      await Promise.all([
        ...before.filter(mz => !keptIds.has(mz.id)).map(mz => adminDeleteMicroZone(mz.id)),
        ...micros.map(m => {
          if (!m.id) return adminAddMicroZone(zoneId, m)
          const prev = before.find(mz => mz.id === m.id)
          const same = prev && prev.label === m.label && prev.active === m.active && prev.sort_order === m.sort_order
          return same ? null : adminEditMicroZone(m.id, m)
        }).filter(Boolean),
      ])
    }

    setSaving(false)
    await reload()
    setForm(null)
  }

  async function handleDelete(id) {
    await adminDeleteZone(id)
    setDeleteConfirm(null)
    await reload()
  }

  if (form !== null) {
    return (
      <ZoneForm
        zone={form}
        children={children}
        onSave={handleSave}
        onCancel={() => setForm(null)}
        saving={saving}
      />
    )
  }

  return (
    <div className="parent-routines-tab">
      <TabGuide summary="How zones work">
        <p className="onboarding-guide-text">
          Zones are the areas of your home — kitchen, bathroom, entryway. Each zone holds
          a few <strong>micro-zones</strong>: small, specific weekly jobs like “wipe the counter”
          or “hang up the coats.”
        </p>
        <p className="onboarding-guide-text">
          Each week, every child is <strong>automatically given</strong> one micro-zone. It shows on
          their card and gets a light check-in morning, midday, and evening. The point isn’t another
          chore — it’s building the habit of <em>noticing</em> what needs doing and handling it
          without being asked.
        </p>
        <p className="onboarding-guide-text">
          Open <strong>This Week</strong> to see who got what and swap anyone’s assignment if you’d
          like, and <strong>Zone Definitions</strong> to add zones and their micro-zones.
        </p>
      </TabGuide>

      <div className="parent-child-tabs" style={{ marginBottom: 12 }}>
        <button className={`parent-child-tab ${view === 'week' ? 'active' : ''}`} onClick={() => setView('week')}>This Week</button>
        <button className={`parent-child-tab ${view === 'defs' ? 'active' : ''}`} onClick={() => setView('defs')}>Zone Definitions</button>
      </div>

      {view === 'week' && !loading && (
        <ThisWeek children={children} defs={defs} onChanged={() => {}} />
      )}

      {view === 'defs' && (
        <>
          <button className="parent-add-chore-btn" onClick={() => setForm({})}>
            + Add Zone
          </button>

          {loading && <p className="parent-soon-msg">Loading…</p>}

          {!loading && defs.length === 0 && (
            <p className="parent-soon-msg">No zones defined yet.</p>
          )}

          {!loading && defs.map(zone => (
            <ZoneRow
              key={zone.id}
              zone={zone}
              children={children}
              onEdit={() => setForm({ ...zone })}
              confirmDelete={deleteConfirm === zone.id}
              onDeleteRequest={() => setDeleteConfirm(zone.id)}
              onConfirmDelete={() => handleDelete(zone.id)}
              onCancelDelete={() => setDeleteConfirm(null)}
            />
          ))}
        </>
      )}
    </div>
  )
}

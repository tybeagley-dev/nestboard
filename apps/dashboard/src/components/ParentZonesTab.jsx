import { useState, useEffect, useCallback } from 'react'
import {
  useZoneDefs,
  adminAddZone, adminEditZone, adminDeleteZone,
  adminAddMicroZone, adminEditMicroZone, adminDeleteMicroZone,
  adminUpdateAssignment, adminAddManualAssignment, adminDeleteAssignment,
} from '../hooks/useZone'
import { apiGet } from '../utils/api'
import { CONFIG } from '../config/config'
import { getTodayKey } from '../utils/dateUtils'

const PIN = CONFIG.parentPin

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

function ThisWeek({ children, defs, onChanged }) {
  const [assignments, setAssignments] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [picking,     setPicking]     = useState(null) // { assignmentId, childId } | 'new-{childId}'

  const load = useCallback(async () => {
    const today = getTodayKey(new Date())
    const data = await apiGet(`/zones/assignments?date=${today}`)
    setAssignments(data?.assignments ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Build a map of micro_zone_id → label for display
  const microZoneMap = {}
  for (const zone of defs) {
    for (const mz of zone.micro_zones) {
      microZoneMap[mz.id] = { label: mz.label, zoneLabel: zone.label, zoneIcon: zone.icon }
    }
  }

  async function handleUpdateAssignment(assignmentId, microZoneId) {
    await adminUpdateAssignment(assignmentId, microZoneId, PIN)
    setPicking(null)
    await load()
    onChanged()
  }

  async function handleAddAssignment(childId, microZoneId) {
    const today = getTodayKey(new Date())
    await adminAddManualAssignment({ child_id: childId, micro_zone_id: microZoneId, date: today }, PIN)
    setPicking(null)
    await load()
    onChanged()
  }

  async function handleDelete(assignmentId) {
    await adminDeleteAssignment(assignmentId, PIN)
    await load()
    onChanged()
  }

  if (loading) return <p className="parent-soon-msg">Loading…</p>

  return (
    <div>
      {picking && (
        <div className="zone-picker-backdrop" onClick={() => setPicking(null)}>
          <div className="zone-picker-modal" onClick={e => e.stopPropagation()}>
            <p className="zone-picker-title">Pick a micro-zone</p>
            <MicroZonePicker
              defs={defs}
              onPick={microZoneId => {
                if (typeof picking === 'string') {
                  const childId = picking.replace('new-', '')
                  handleAddAssignment(childId, microZoneId)
                } else {
                  handleUpdateAssignment(picking, microZoneId)
                }
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
              {child.emoji} {child.name}
            </div>

            {auto ? (
              <div className="chore-admin-row">
                <div className="chore-admin-info">
                  <span className="chore-admin-label">{auto.micro_zone_label}</span>
                  <span className="chore-admin-meta">{auto.zone_icon} {auto.zone_label} · auto</span>
                </div>
                <button className="chore-admin-edit-btn" onClick={() => setPicking(auto.id)}>Change</button>
              </div>
            ) : (
              <p className="parent-soon-msg" style={{ fontSize: 12, padding: '4px 0' }}>No auto assignment yet</p>
            )}

            {manual.map(a => (
              <div key={a.id} className="chore-admin-row" style={{ paddingLeft: 12 }}>
                <div className="chore-admin-info">
                  <span className="chore-admin-label">{a.micro_zone_label}</span>
                  <span className="chore-admin-meta">{a.zone_icon} {a.zone_label} · added</span>
                </div>
                <button className="chore-admin-del-btn" onClick={() => handleDelete(a.id)}>×</button>
              </div>
            ))}

            <button
              className="chore-admin-row"
              style={{ color: 'var(--accent-warm)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 12 }}
              onClick={() => setPicking(`new-${child.id}`)}
            >
              + Add zone for {child.name}
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ── Micro-zone row ────────────────────────────────────────────────────────────

function MicroZoneRow({ item, onUpdated, confirmDelete, onDeleteRequest, onConfirmDelete, onCancelDelete }) {
  const [editing, setEditing] = useState(false)
  const [label,   setLabel]   = useState(item.label)
  const [active,  setActive]  = useState(item.active)
  const [saving,  setSaving]  = useState(false)

  async function handleSave() {
    setSaving(true)
    await adminEditMicroZone(item.id, { label, active, sort_order: item.sort_order }, PIN)
    setSaving(false)
    setEditing(false)
    onUpdated()
  }

  if (confirmDelete) {
    return (
      <div className="chore-admin-row deleting" style={{ paddingLeft: 24 }}>
        <span className="chore-delete-msg">Remove "{item.label}"?</span>
        <button className="chore-delete-yes" onClick={onConfirmDelete}>Remove</button>
        <button className="chore-delete-no"  onClick={onCancelDelete}>Cancel</button>
      </div>
    )
  }

  if (editing) {
    return (
      <div className="chore-admin-row" style={{ paddingLeft: 24, flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
        <input
          className="chore-form-input"
          value={label}
          onChange={e => setLabel(e.target.value)}
          autoFocus
        />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
            Active
          </label>
          <button className="parent-apply-btn" onClick={handleSave} disabled={saving || !label.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button className="btn-cancel-spend" onClick={() => setEditing(false)}>Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div className="chore-admin-row" style={{ paddingLeft: 24 }}>
      <div className="chore-admin-info">
        <span className="chore-admin-label" style={{ opacity: active ? 1 : 0.45 }}>
          {item.label}
          {!active && <span className="chore-inactive-badge"> inactive</span>}
        </span>
      </div>
      <button className="chore-admin-edit-btn" onClick={() => setEditing(true)}>Edit</button>
      <button className="chore-admin-del-btn"  onClick={onDeleteRequest}>×</button>
    </div>
  )
}

// ── Zone row ──────────────────────────────────────────────────────────────────

function ZoneRow({ zone, children, onEdit, onUpdated, confirmDelete, onDeleteRequest, onConfirmDelete, onCancelDelete }) {
  const [expanded,     setExpanded]     = useState(false)
  const [addingItem,   setAddingItem]   = useState(false)
  const [newItemLabel, setNewItemLabel] = useState('')
  const [savingItem,   setSavingItem]   = useState(false)
  const [deleteItem,   setDeleteItem]   = useState(null)

  async function handleAddItem() {
    if (!newItemLabel.trim()) return
    setSavingItem(true)
    await adminAddMicroZone(zone.id, { label: newItemLabel.trim(), active: true, sort_order: zone.micro_zones.length }, PIN)
    setNewItemLabel('')
    setAddingItem(false)
    setSavingItem(false)
    onUpdated()
  }

  async function handleDeleteItem(id) {
    await adminDeleteMicroZone(id, PIN)
    setDeleteItem(null)
    onUpdated()
  }

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
    <div className="zone-admin-block">
      <div className="chore-admin-row">
        <span className="chore-admin-icon">{zone.icon || '📍'}</span>
        <div className="chore-admin-info">
          <span className="chore-admin-label">{zone.label}</span>
          <span className="chore-admin-meta">{eligibleNames} · {zone.micro_zones.length} micro-zone{zone.micro_zones.length !== 1 ? 's' : ''}</span>
        </div>
        <button className="chore-admin-edit-btn" onClick={() => setExpanded(e => !e)}>
          {expanded ? 'Collapse' : 'Micro-zones'}
        </button>
        <button className="chore-admin-edit-btn" onClick={onEdit}>Edit</button>
        <button className="chore-admin-del-btn"  onClick={onDeleteRequest}>×</button>
      </div>

      {expanded && (
        <div className="zone-items-section">
          {zone.micro_zones.map(item => (
            <MicroZoneRow
              key={item.id}
              item={item}
              onUpdated={onUpdated}
              confirmDelete={deleteItem === item.id}
              onDeleteRequest={() => setDeleteItem(item.id)}
              onConfirmDelete={() => handleDeleteItem(item.id)}
              onCancelDelete={() => setDeleteItem(null)}
            />
          ))}

          {addingItem ? (
            <div className="chore-admin-row" style={{ paddingLeft: 24, gap: 8 }}>
              <input
                className="chore-form-input"
                value={newItemLabel}
                onChange={e => setNewItemLabel(e.target.value)}
                placeholder="Micro-zone label"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleAddItem() }}
              />
              <button className="parent-apply-btn" onClick={handleAddItem} disabled={savingItem || !newItemLabel.trim()}>
                {savingItem ? '…' : 'Add'}
              </button>
              <button className="btn-cancel-spend" onClick={() => setAddingItem(false)}>Cancel</button>
            </div>
          ) : (
            <button
              className="chore-admin-row"
              style={{ paddingLeft: 24, color: 'var(--accent-warm)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              onClick={() => setAddingItem(true)}
            >
              + Add micro-zone
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Zone form ─────────────────────────────────────────────────────────────────

function ZoneForm({ zone, children, onSave, onCancel, saving }) {
  const [label,    setLabel]    = useState(zone?.label ?? '')
  const [icon,     setIcon]     = useState(zone?.icon ?? '')
  const [eligible, setEligible] = useState(zone?.eligible_child_ids ?? [])

  function toggleEligible(id) {
    setEligible(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function handleSave() {
    if (!label.trim()) return
    onSave({ ...zone, label: label.trim(), icon, eligible_child_ids: eligible })
  }

  return (
    <div className="chore-form">
      <div className="chore-form-row">
        <div className="chore-form-field">
          <label className="chore-form-label">Label</label>
          <input className="chore-form-input" value={label} onChange={e => setLabel(e.target.value)} placeholder="TV Room" autoFocus />
        </div>
        <div className="chore-form-field">
          <label className="chore-form-label">Icon</label>
          <input className="chore-form-input chore-form-icon-input" value={icon} onChange={e => setIcon(e.target.value)} placeholder="📺" />
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

  async function handleSave(data) {
    setSaving(true)
    if (data.id) await adminEditZone(data.id, data, PIN)
    else         await adminAddZone(data, PIN)
    setSaving(false)
    await reload()
    setForm(null)
  }

  async function handleDelete(id) {
    await adminDeleteZone(id, PIN)
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
              onUpdated={reload}
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

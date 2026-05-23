import { useState } from 'react'
import { apiPost, apiPut, apiDelete } from '../utils/api'
import { CONFIG } from '../config/config'

const COLOR_PRESETS = ['#C4837A', '#6B8BA4', '#7D9B76', '#A68B5B', '#8B7BB5', '#5B9BA6', '#A67B8B', '#7BA67B']

function emptyChild() {
  return { name: '', color: COLOR_PRESETS[0], emoji: '👤' }
}

function ChildForm({ child, onSave, onCancel, saving }) {
  const [name,  setName]  = useState(child.name  || '')
  const [color, setColor] = useState(child.color || COLOR_PRESETS[0])
  const [emoji, setEmoji] = useState(child.emoji || '👤')

  function handleSave() {
    if (!name.trim()) return
    onSave({ ...child, name: name.trim(), color, emoji })
  }

  return (
    <div className="chore-form">
      <div className="chore-form-field">
        <label className="chore-form-label">Name</label>
        <input
          className="chore-form-input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Child's name"
          autoFocus
        />
      </div>

      <div className="chore-form-row">
        <div className="chore-form-field">
          <label className="chore-form-label">Emoji</label>
          <input
            className="chore-form-input chore-form-icon-input"
            value={emoji}
            onChange={e => setEmoji(e.target.value)}
            placeholder="👤"
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
      </div>

      <div style={{ marginTop: 12 }}>
        <div className="parent-child-avatar" style={{ background: color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: '50%', fontSize: 24 }}>
          {emoji}
        </div>
      </div>

      <div className="chore-form-actions">
        <button className="parent-apply-btn" onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? 'Saving…' : (child.id ? 'Save Changes' : 'Add Child')}
        </button>
        <button className="btn-cancel-spend" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

function ChildRow({ child, onEdit, confirmDelete, onDeleteRequest, onConfirmDelete, onCancelDelete }) {
  if (confirmDelete) {
    return (
      <div className="chore-admin-row deleting">
        <span className="chore-delete-msg">Remove {child.name}? This cannot be undone.</span>
        <button className="chore-delete-yes" onClick={onConfirmDelete}>Remove</button>
        <button className="chore-delete-no"  onClick={onCancelDelete}>Cancel</button>
      </div>
    )
  }

  return (
    <div className="chore-admin-row">
      <span className="chore-admin-icon" style={{ background: child.color, borderRadius: '50%', width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        {child.emoji}
      </span>
      <div className="chore-admin-info">
        <span className="chore-admin-label">{child.name}</span>
      </div>
      <button className="chore-admin-edit-btn" onClick={onEdit}>Edit</button>
      <button className="chore-admin-del-btn"  onClick={onDeleteRequest}>×</button>
    </div>
  )
}

export default function ParentChildrenTab({ children, onReload }) {
  const [form,          setForm]          = useState(null)
  const [saving,        setSaving]        = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  async function handleSave(data) {
    setSaving(true)
    if (data.id) await apiPut(`/children/${data.id}`, data, CONFIG.parentPin)
    else         await apiPost('/children', data, CONFIG.parentPin)
    setSaving(false)
    await onReload()
    setForm(null)
  }

  async function handleDelete(id) {
    await apiDelete(`/children/${id}`, CONFIG.parentPin)
    setDeleteConfirm(null)
    await onReload()
  }

  if (form !== null) {
    return (
      <ChildForm
        child={form}
        onSave={handleSave}
        onCancel={() => setForm(null)}
        saving={saving}
      />
    )
  }

  return (
    <div className="parent-chores-tab">
      <button className="parent-add-chore-btn" onClick={() => setForm(emptyChild())}>
        + Add Child
      </button>

      {children.length === 0 && <p className="parent-soon-msg">No children yet.</p>}

      {children.map(child => (
        <ChildRow
          key={child.id}
          child={child}
          confirmDelete={deleteConfirm === child.id}
          onEdit={() => setForm({ ...child })}
          onDeleteRequest={() => setDeleteConfirm(child.id)}
          onConfirmDelete={() => handleDelete(child.id)}
          onCancelDelete={() => setDeleteConfirm(null)}
        />
      ))}
    </div>
  )
}

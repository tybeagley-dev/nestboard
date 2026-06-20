import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { apiPost, apiPut, apiDelete, apiGet } from '../utils/api'
import ChildIcon from './ChildIcon'
import { CHILD_ICONS } from '../config/childIcons'

const COLOR_PRESETS = ['#C4837A', '#6B8BA4', '#7D9B76', '#A68B5B', '#8B7BB5', '#5B9BA6', '#A67B8B', '#7BA67B']

export function emptyChild() {
  return { name: '', color: COLOR_PRESETS[0], emoji: '👤', icon: 'user' }
}

export function ChildForm({ child, onSave, onCancel, saving }) {
  const [name,  setName]  = useState(child.name  || '')
  const [color, setColor] = useState(child.color || COLOR_PRESETS[0])
  const [icon,  setIcon]  = useState(child.icon  || 'user')

  function handleSave() {
    if (!name.trim()) return
    // emoji passed through unchanged (legacy column); icon is what renders now.
    onSave({ ...child, name: name.trim(), color, icon })
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
        <label className="chore-form-label">Icon</label>
        <div className="icon-picker">
          {CHILD_ICONS.map(({ name: n, Icon }) => (
            <button
              key={n}
              type="button"
              className={`icon-picker-btn ${icon === n ? 'selected' : ''}`}
              onClick={() => setIcon(n)}
              aria-label={n}
            >
              <Icon size={20} strokeWidth={2} />
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div className="parent-child-avatar" style={{ background: color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: '50%' }}>
          <ChildIcon name={icon} size={24} />
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

export function ChildRow({ child, onEdit, confirmDelete, onDeleteRequest, onConfirmDelete, onCancelDelete }) {
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
        <ChildIcon name={child.icon} size={18} />
      </span>
      <div className="chore-admin-info">
        <span className="chore-admin-label">{child.name}</span>
      </div>
      <button className="chore-admin-edit-btn" onClick={onEdit}>Edit</button>
      <button className="chore-admin-del-btn"  onClick={onDeleteRequest}>×</button>
    </div>
  )
}

export function ChildQRSection({ children, slug }) {
  const [copied, setCopied] = useState(null)

  if (!slug) return null

  function childUrl(child) {
    return `${window.location.origin}/${slug}/child/${child.id}`
  }

  function handleCopy(child) {
    navigator.clipboard.writeText(childUrl(child))
    setCopied(child.id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="child-qr-section">
      <h3 className="child-qr-section-title">Child View Links</h3>
      <div className="child-qr-list">
        {children.map(child => (
          <div key={child.id} className="child-qr-row">
            <div className="child-qr-meta">
              <span className="child-qr-avatar" style={{ background: child.color }}><ChildIcon name={child.icon} size={18} /></span>
              <span className="child-qr-name">{child.name}</span>
              <button className="child-qr-copy" onClick={() => handleCopy(child)}>
                {copied === child.id ? 'Copied!' : 'Copy URL'}
              </button>
            </div>
            <div className="child-qr-code-wrap">
              <QRCodeSVG
                value={childUrl(child)}
                size={128}
                level="H"
                fgColor={child.color}
                bgColor="transparent"
              />
              <div className="child-qr-emoji-bubble">
                <ChildIcon name={child.icon} size={20} color={child.color} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ParentChildrenTab({ children, onReload }) {
  const [form,          setForm]          = useState(null)
  const [saving,        setSaving]        = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [familySlug,    setFamilySlug]    = useState(null)

  useEffect(() => {
    apiGet('/auth/family').then(data => {
      if (data?.slug) setFamilySlug(data.slug)
    })
  }, [])

  async function handleSave(data) {
    setSaving(true)
    if (data.id) await apiPut(`/children/${data.id}`, data)
    else         await apiPost('/children', data)
    setSaving(false)
    await onReload()
    setForm(null)
  }

  async function handleDelete(id) {
    await apiDelete(`/children/${id}`)
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

      {children.length > 0 && (
        <ChildQRSection children={children} slug={familySlug} />
      )}
    </div>
  )
}

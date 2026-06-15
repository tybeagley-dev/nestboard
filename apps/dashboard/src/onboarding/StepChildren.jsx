import { useState } from 'react'
import { apiPost, apiPut, apiDelete } from '../utils/api'
import { ChildForm, ChildRow, emptyChild } from '../components/ParentChildrenTab'

// Onboarding writes authorize via the Clerk owner session (requireParent path A),
// so no parent PIN is passed here.
export default function StepChildren({ children, reload }) {
  const [form,          setForm]          = useState(null)
  const [saving,        setSaving]        = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  async function handleSave(data) {
    setSaving(true)
    if (data.id) await apiPut(`/children/${data.id}`, data)
    else         await apiPost('/children', data)
    setSaving(false)
    await reload()
    setForm(null)
  }

  async function handleDelete(id) {
    await apiDelete(`/children/${id}`)
    setDeleteConfirm(null)
    await reload()
  }

  if (form !== null) {
    return <ChildForm child={form} onSave={handleSave} onCancel={() => setForm(null)} saving={saving} />
  }

  return (
    <div className="onboarding-step-children">
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
      <button className="parent-add-chore-btn" onClick={() => setForm(emptyChild())}>
        + Add Child
      </button>
    </div>
  )
}

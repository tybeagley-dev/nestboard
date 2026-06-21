import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet, apiDelete } from './utils/api'

// Internal super-admin surface (gated server-side by ADMIN_USER_IDS). Lists all
// families and lets an admin drill in, remove members, or delete a whole family.
export default function AdminPage() {
  const navigate = useNavigate()
  const [families, setFamilies] = useState(undefined) // undefined = loading, null = forbidden
  const [detail,   setDetail]   = useState(null)
  const [confirmName, setConfirmName] = useState('')   // type-to-confirm family delete
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    apiGet('/admin/families').then(d => setFamilies(Array.isArray(d) ? d : null))
  }, [])

  useEffect(() => { load() }, [load])

  function openFamily(id) {
    setConfirmName('')
    apiGet(`/admin/families/${id}`).then(d => { if (d?.id) setDetail(d) })
  }

  async function removeMember(famId, userId) {
    setBusy(true)
    await apiDelete(`/admin/families/${famId}/members/${userId}`)
    setBusy(false)
    openFamily(famId)
  }

  async function deleteFamily(id) {
    setBusy(true)
    await apiDelete(`/admin/families/${id}`)
    setBusy(false)
    setDetail(null)
    setConfirmName('')
    load()
  }

  if (families === undefined) return <div className="admin-page"><p>Loading…</p></div>
  if (families === null) {
    return (
      <div className="admin-page">
        <h1 className="admin-title">Admin</h1>
        <p>Not authorized.</p>
        <button className="admin-btn" onClick={() => navigate('/')}>Back to nestboard</button>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1 className="admin-title">Admin · {families.length} families</h1>
        <button className="admin-btn" onClick={() => navigate('/')}>Back</button>
      </div>

      <table className="admin-table">
        <thead>
          <tr><th>Family</th><th>Slug</th><th>Members</th><th>Kids</th><th>Onboarded</th><th>Created</th><th></th></tr>
        </thead>
        <tbody>
          {families.map(f => (
            <tr key={f.id}>
              <td>{f.name}</td>
              <td><code>{f.slug}</code></td>
              <td>{f.member_count}</td>
              <td>{f.child_count}</td>
              <td>{f.onboarded ? '✓' : '—'}</td>
              <td>{new Date(f.created_at).toLocaleDateString()}</td>
              <td><button className="admin-btn admin-btn-sm" onClick={() => openFamily(f.id)}>View</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {detail && (
        <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setDetail(null)}>
          <div className="modal-card admin-detail">
            <button className="modal-close" onClick={() => setDetail(null)}>×</button>
            <h2 className="admin-detail-title">{detail.name}</h2>
            <p className="admin-detail-sub"><code>{detail.slug}</code> · created {new Date(detail.created_at).toLocaleDateString()}</p>

            <h3 className="admin-section-title">Members</h3>
            <ul className="member-list">
              {detail.members.map(m => (
                <li key={m.user_id} className="member-row">
                  <span className="member-email">{m.email}</span>
                  <span className="member-role">{m.role}</span>
                  {m.role !== 'owner' && (
                    <button className="member-remove" disabled={busy} onClick={() => removeMember(detail.id, m.user_id)}>Remove</button>
                  )}
                </li>
              ))}
            </ul>

            <h3 className="admin-section-title">Children</h3>
            {detail.children.length === 0
              ? <p className="family-code-hint">None.</p>
              : <p className="family-code-hint">{detail.children.map(c => c.name).join(', ')}</p>}

            <h3 className="admin-section-title admin-danger">Delete family</h3>
            <p className="family-code-hint">Permanently deletes this family and all its data. Type <strong>{detail.name}</strong> to confirm.</p>
            <div className="admin-delete-row">
              <input
                className="chore-form-input"
                value={confirmName}
                onChange={e => setConfirmName(e.target.value)}
                placeholder={detail.name}
              />
              <button
                className="admin-btn admin-btn-danger"
                disabled={busy || confirmName !== detail.name}
                onClick={() => deleteFamily(detail.id)}
              >
                {busy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

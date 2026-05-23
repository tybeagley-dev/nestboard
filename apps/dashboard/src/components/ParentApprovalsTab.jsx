import { useState, useEffect, useCallback } from 'react'
import { triggerChoreRefetch } from '../hooks/useAssignedChores'
import { CONFIG } from '../config/config'
import BuckBadge from './BuckBadge'
import { apiGet, apiPost } from '../utils/api'

export default function ParentApprovalsTab({ children = [] }) {
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [acting,  setActing]  = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await apiGet('/chores/pending-approvals')
    setPending(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleApprove(item) {
    setActing(item.chore_id)
    await apiPost(`/chores/${item.chore_id}/approve`, { child: item.child }, CONFIG.parentPin)
    triggerChoreRefetch()
    await load()
    setActing(null)
  }

  async function handleReject(item) {
    setActing(item.chore_id)
    await apiPost(`/chores/${item.chore_id}/reject`, { child: item.child }, CONFIG.parentPin)
    triggerChoreRefetch()
    await load()
    setActing(null)
  }

  if (loading) return <p className="parent-soon-msg">Loading…</p>

  if (pending.length === 0) {
    return (
      <div className="approvals-empty">
        <span className="approvals-empty-icon">✅</span>
        <p>No chores waiting for approval.</p>
      </div>
    )
  }

  return (
    <div className="parent-approvals-tab">
      {pending.map(item => {
        const child = children.find(c => c.name === item.child)
        const busy  = acting === item.chore_id
        return (
          <div key={`${item.child}-${item.chore_id}`} className="approval-row">
            <div className="approval-info">
              {child && (
                <span className="approval-avatar" style={{ background: child.color }}>
                  {child.emoji}
                </span>
              )}
              <div className="approval-meta">
                <span className="approval-child">{item.child}</span>
                <span className="approval-label">{item.chore_label}</span>
              </div>
              <BuckBadge amount={item.bucks} />
            </div>
            <div className="approval-actions">
              <button
                className="approval-btn approve"
                onClick={() => handleApprove(item)}
                disabled={busy}
              >
                {busy ? '…' : '✓ Approve'}
              </button>
              <button
                className="approval-btn reject"
                onClick={() => handleReject(item)}
                disabled={busy}
              >
                {busy ? '…' : '✗ Reject'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

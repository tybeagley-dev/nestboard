import { useState, useEffect, useCallback } from 'react'
import { triggerChoreRefetch } from '../hooks/useAssignedChores'
import { useSseRefetch } from '../hooks/useLiveSync'
import TokenBadge from './TokenBadge'
import ChildIcon from './ChildIcon'
import { apiGet, apiPost } from '../utils/api'

export default function ParentApprovalsTab({ children = [] }) {
  const [pending,          setPending]          = useState([])
  const [purchaseRequests, setPurchaseRequests] = useState([])
  const [abstinenceRequests, setAbstinenceRequests] = useState([])
  const [loading,          setLoading]          = useState(true)
  const [acting,           setActing]           = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [chores, purchases, abstinence] = await Promise.all([
      apiGet('/chores/pending-approvals'),
      apiGet('/screen-time/purchase-requests'),
      apiGet('/screen-time/abstinence-requests'),
    ])
    setPending(Array.isArray(chores) ? chores : [])
    setPurchaseRequests(Array.isArray(purchases) ? purchases : [])
    setAbstinenceRequests(Array.isArray(abstinence) ? abstinence : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Live: a new request or chore submission elsewhere refreshes the approvals list
  useSseRefetch('screen_time_requests', load)
  useSseRefetch('chore_state', load)

  async function handleChoreApprove(item) {
    setActing(`chore-${item.chore_id}`)
    await apiPost(`/chores/${item.chore_id}/approve`, { child: item.child })
    triggerChoreRefetch()
    await load()
    setActing(null)
  }

  async function handleChoreReject(item) {
    setActing(`chore-${item.chore_id}`)
    await apiPost(`/chores/${item.chore_id}/reject`, { child: item.child })
    triggerChoreRefetch()
    await load()
    setActing(null)
  }

  async function handlePurchaseApprove(item) {
    setActing(`purchase-${item.id}`)
    await apiPost(`/screen-time/purchase-requests/${item.id}/approve`, {})
    await load()
    setActing(null)
  }

  async function handlePurchaseReject(item) {
    setActing(`purchase-${item.id}`)
    await apiPost(`/screen-time/purchase-requests/${item.id}/reject`, {})
    await load()
    setActing(null)
  }

  async function handleAbstinenceApprove(item) {
    setActing(`abs-${item.id}`)
    await apiPost(`/screen-time/abstinence-requests/${item.id}/approve`, {})
    await load()
    setActing(null)
  }

  async function handleAbstinenceReject(item) {
    setActing(`abs-${item.id}`)
    await apiPost(`/screen-time/abstinence-requests/${item.id}/reject`, {})
    await load()
    setActing(null)
  }

  const totalPending = pending.length + purchaseRequests.length + abstinenceRequests.length

  if (loading) return <p className="parent-soon-msg">Loading…</p>

  if (totalPending === 0) {
    return (
      <div className="approvals-empty">
        <span className="approvals-empty-icon">✅</span>
        <p>No pending approvals.</p>
      </div>
    )
  }

  return (
    <div className="parent-approvals-tab">

      {pending.length > 0 && (
        <section>
          <h3 className="approvals-section-title">Chores</h3>
          {pending.map(item => {
            const child = children.find(c => c.name === item.child)
            const busy  = acting === `chore-${item.chore_id}`
            return (
              <div key={`${item.child}-${item.chore_id}`} className="approval-row">
                <div className="approval-info">
                  {child && (
                    <span className="approval-avatar" style={{ background: child.color }}>
                      <ChildIcon name={child.icon} size={16} />
                    </span>
                  )}
                  <div className="approval-meta">
                    <span className="approval-child">{item.child}</span>
                    <span className="approval-label">{item.chore_label}</span>
                  </div>
                  <TokenBadge amount={item.tokens} />
                </div>
                <div className="approval-actions">
                  <button className="approval-btn approve" onClick={() => handleChoreApprove(item)} disabled={busy}>
                    {busy ? '…' : '✓ Approve'}
                  </button>
                  <button className="approval-btn reject" onClick={() => handleChoreReject(item)} disabled={busy}>
                    {busy ? '…' : '✗ Reject'}
                  </button>
                </div>
              </div>
            )
          })}
        </section>
      )}

      {purchaseRequests.length > 0 && (
        <section>
          <h3 className="approvals-section-title">Screen Time Purchases</h3>
          {purchaseRequests.map(item => {
            const child = children.find(c => c.name === item.child)
            const busy  = acting === `purchase-${item.id}`
            return (
              <div key={item.id} className="approval-row">
                <div className="approval-info">
                  {child && (
                    <span className="approval-avatar" style={{ background: child.color }}>
                      <ChildIcon name={child.icon} size={16} />
                    </span>
                  )}
                  <div className="approval-meta">
                    <span className="approval-child">{item.child}</span>
                    <span className="approval-label">{item.minutes_amount} min screen time</span>
                  </div>
                  <TokenBadge amount={item.tokens_amount} />
                </div>
                <div className="approval-actions">
                  <button className="approval-btn approve" onClick={() => handlePurchaseApprove(item)} disabled={busy}>
                    {busy ? '…' : '✓ Approve'}
                  </button>
                  <button className="approval-btn reject" onClick={() => handlePurchaseReject(item)} disabled={busy}>
                    {busy ? '…' : '✗ Reject'}
                  </button>
                </div>
              </div>
            )
          })}
        </section>
      )}

      {abstinenceRequests.length > 0 && (
        <section>
          <h3 className="approvals-section-title">Screen-Free Day Rewards</h3>
          <p className="approvals-section-note">Approve if the child had a normal day at home and chose not to use screen time. Reject if they weren't home or otherwise ineligible.</p>
          {abstinenceRequests.map(item => {
            const child   = children.find(c => c.name === item.child)
            const busy    = acting === `abs-${item.id}`
            const dateStr = new Date(item.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
            return (
              <div key={item.id} className="approval-row">
                <div className="approval-info">
                  {child && (
                    <span className="approval-avatar" style={{ background: child.color }}>
                      <ChildIcon name={child.icon} size={16} />
                    </span>
                  )}
                  <div className="approval-meta">
                    <span className="approval-child">{item.child}</span>
                    <span className="approval-label">No screen time — {dateStr}</span>
                  </div>
                  <TokenBadge amount={item.tokens_awarded} />
                </div>
                <div className="approval-actions">
                  <button className="approval-btn approve" onClick={() => handleAbstinenceApprove(item)} disabled={busy}>
                    {busy ? '…' : '✓ Approve'}
                  </button>
                  <button className="approval-btn reject" onClick={() => handleAbstinenceReject(item)} disabled={busy}>
                    {busy ? '…' : '✗ Reject'}
                  </button>
                </div>
              </div>
            )
          })}
        </section>
      )}
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { triggerChoreRefetch } from '../hooks/useAssignedChores'
import { useSseRefetch } from '../hooks/useLiveSync'
import TokenBadge from './TokenBadge'
import ChildIcon from './ChildIcon'
import TabGuide from './TabGuide'
import { useLabels, useSettings } from '../FamilyContext'
import { apiGet, apiPost } from '../utils/api'

// What actually reaches this queue, by enabled module. Reward-store purchases
// deliberately aren't listed: `requires_approval` on a reward is a UI flag that
// tells the child to go ask, it never creates a request here.
function ApprovalsGuide({ modules, labels }) {
  const tokens = labels.tokenName.toLowerCase()
  return (
    <TabGuide summary="How approvals work">
      <p className="onboarding-guide-text">
        Nothing a child submits counts until you say so. Checking a chore off marks it
        {' '}<strong>pending</strong> on their card and sends it here — approving is what actually
        pays out the {tokens}. Rejecting sends it back unfinished, so use it for "not done yet"
        rather than as a punishment.
      </p>
      <p className="onboarding-guide-text">
        <strong>Chores</strong> — a finished chore waiting on you. The badge shows what it pays.
      </p>
      {modules.screenTime && (
        <p className="onboarding-guide-text">
          <strong>Screen time</strong> — a child asking to trade {tokens} for minutes. Approving
          deducts the {tokens} and banks the minutes; rejecting costs them nothing.
        </p>
      )}
      {modules.screenTime && modules.tokens && (
        <p className="onboarding-guide-text">
          <strong>Screen-free day</strong> — filed automatically each morning for any child who used
          no screen time the day before. Approve if they were home and genuinely chose not to;
          reject if they were away or it wasn't a fair test.
        </p>
      )}
      <p className="onboarding-guide-text">
        Everything in nestboard is shared across every device signed in to your family, and this
        list updates live — a request made on the family screen, your phone, or a child's own page
        shows up here within seconds, and approving it updates everywhere at once.
      </p>
      <p className="onboarding-guide-text">
        Buying something in the {labels.rewardsName.toLowerCase()} doesn't come here — those are
        paid for instantly and land in the child's <strong>Wallet</strong> — things they've bought
        but not yet used. You'll find the same list as <strong>Pending Redemptions</strong> on the
        {' '}{labels.rewardsName} tab, where you mark one redeemed once they've had it.
      </p>
    </TabGuide>
  )
}

export default function ParentApprovalsTab({ children = [] }) {
  const [pending,          setPending]          = useState([])
  const [purchaseRequests, setPurchaseRequests] = useState([])
  const [abstinenceRequests, setAbstinenceRequests] = useState([])
  const [loading,          setLoading]          = useState(true)
  const [acting,           setActing]           = useState(null)
  const labels    = useLabels()
  const { modules } = useSettings()

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

  // The guide sits above the empty state on purpose — an empty queue is exactly
  // when a new parent first opens this tab and needs to know what lands here.
  if (totalPending === 0) {
    return (
      <div className="parent-approvals-tab">
        <ApprovalsGuide modules={modules} labels={labels} />
        <div className="approvals-empty">
          <span className="approvals-empty-icon">✅</span>
          <p>No pending approvals.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="parent-approvals-tab">
      <ApprovalsGuide modules={modules} labels={labels} />

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
                    <span className="approval-label">
                      {item.chore_label}
                      {item.is_bonus && <span className="bonus-tag">bonus</span>}
                    </span>
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

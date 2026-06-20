import { useState, useEffect } from 'react'
import { useChorePoints } from '../hooks/useChores'
import { useRewards, usePurchases, buyReward } from '../hooks/useRewards'
import { useLabels } from '../FamilyContext'
import TokenBadge from './TokenBadge'
import ChildIcon from './ChildIcon'

const PHASE = { VIEW: 'view', STORE: 'store', CONFIRM: 'confirm' }

export default function TokensModal({ child, onClose }) {
  const labels = useLabels()
  const { tokens, reloadTokens }         = useChorePoints(child.name)
  const { items, loading }             = useRewards()
  const { purchases, loading: pwLoad } = usePurchases(child.name)
  const [phase,       setPhase]       = useState(PHASE.VIEW)
  const [selected,    setSelected]    = useState(null)
  const [buying,      setBuying]      = useState(false)
  const [askedItemId, setAskedItemId] = useState(null)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleBuy() {
    setBuying(true)
    const result = await buyReward(child.name, selected.id)
    if (result?.success) await reloadTokens()
    setBuying(false)
    onClose()
  }

  function handleItemTap(item) {
    if (item.requiresApproval) {
      setAskedItemId(item.id === askedItemId ? null : item.id)
      return
    }
    if (tokens < item.cost) return
    setSelected(item)
    setPhase(PHASE.CONFIRM)
  }

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card tokens-modal">
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>

        <div className="modal-child-header">
          <div className="modal-avatar" style={{ background: child.color }}>
            <ChildIcon name={child.icon} size={22} />
          </div>
          <div>
            <h2 className="modal-title">{child.name}'s {labels.tokenName}</h2>
            <p className="tokens-modal-balance"><TokenBadge amount={tokens} /> {labels.tokenName}</p>
          </div>
        </div>

        {phase === PHASE.VIEW && (
          <div className="tokens-view-phase">
            <div className="tokens-big-balance">{tokens}</div>
            <p className="tokens-big-label">{labels.tokenName}</p>
            <button
              className="btn-spend"
              onClick={() => setPhase(PHASE.STORE)}
              disabled={items.length === 0 && !loading}
            >
              Spend {labels.tokenName}
            </button>

            {!pwLoad && purchases.length > 0 && (
              <div className="wallet-section">
                <p className="wallet-heading">My Wallet</p>
                {purchases.map(p => (
                  <div key={p.id} className="wallet-row">
                    <span className="wallet-icon">{p.itemIcon || '🎁'}</span>
                    <span className="wallet-label">{p.item_label}</span>
                    <span className="wallet-cost"><TokenBadge amount={p.cost} /></span>
                  </div>
                ))}
                <p className="wallet-hint">Show this to a parent to use it!</p>
              </div>
            )}
          </div>
        )}

        {phase === PHASE.STORE && (
          <div className="store-phase">
            <p className="store-heading">{labels.rewardsName}</p>
            {loading && <p className="parent-soon-msg">Loading…</p>}
            {!loading && items.length === 0 && (
              <p className="parent-soon-msg">No items in the store yet.</p>
            )}
            <div className="store-grid">
              {items.map(item => {
                const canAfford   = tokens >= item.cost
                const isAsked     = askedItemId === item.id
                return (
                  <div
                    key={item.id}
                    className={`store-card ${!canAfford && !item.requiresApproval ? 'store-card--unaffordable' : ''} ${item.requiresApproval ? 'store-card--ask' : ''}`}
                    onClick={() => handleItemTap(item)}
                  >
                    <span className="store-card-icon">{item.icon || '🎁'}</span>
                    <span className="store-card-label">{item.label}</span>
                    <TokenBadge amount={item.cost} />
                    {item.requiresApproval ? (
                      <span className="store-card-ask-badge">
                        {isAsked ? '👋 Ask a parent!' : 'Ask a grown up'}
                      </span>
                    ) : !canAfford ? (
                      <span className="store-card-need">
                        Need {item.cost - tokens} more
                      </span>
                    ) : null}
                  </div>
                )
              })}
            </div>
            <button className="btn-cancel-spend" onClick={() => setPhase(PHASE.VIEW)}>
              Back
            </button>
          </div>
        )}

        {phase === PHASE.CONFIRM && selected && (
          <div className="tokens-spend-phase">
            <p className="spend-prompt">Spend {labels.tokenName}?</p>
            <div className="store-confirm-item">
              <span className="store-confirm-icon">{selected.icon || '🎁'}</span>
              <span className="store-confirm-label">{selected.label}</span>
            </div>
            <p className="spend-remaining">
              {labels.tokenName} after: <TokenBadge amount={Math.max(0, tokens - selected.cost)} size="lg" />
            </p>
            <div className="spend-actions">
              <button
                className="btn-confirm-spend"
                onClick={handleBuy}
                disabled={buying}
              >
                {buying ? 'Buying…' : `✓ Spend ${selected.cost} ${labels.tokenName}`}
              </button>
              <button className="btn-cancel-spend" onClick={() => setPhase(PHASE.STORE)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

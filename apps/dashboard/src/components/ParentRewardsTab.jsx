import { useState, useEffect, useCallback } from 'react'
import { adminGetAllRewards, adminAddReward, adminEditReward, adminDeleteReward, usePurchases, redeemPurchase, buyReward } from '../hooks/useRewards'
import { useLabels } from '../FamilyContext'
import TabGuide from './TabGuide'
import TokenBadge from './TokenBadge'

function emptyItem() {
  return { id: '', label: '', icon: '', cost: 5, requiresApproval: false, active: true }
}

// ── Item row ──────────────────────────────────────────────────────────────────

function StoreRow({ item, onEdit, confirmDelete, onDeleteRequest, onConfirmDelete, onCancelDelete }) {
  if (confirmDelete) {
    return (
      <div className="chore-admin-row deleting">
        <span className="chore-delete-msg">Remove "{item.label}"?</span>
        <button className="chore-delete-yes" onClick={onConfirmDelete}>Remove</button>
        <button className="chore-delete-no"  onClick={onCancelDelete}>Cancel</button>
      </div>
    )
  }

  return (
    <div className={`chore-admin-row ${item.active === false ? 'chore-admin-row--inactive' : ''}`}>
      <span className="chore-admin-icon">{item.icon || '🎁'}</span>
      <div className="chore-admin-info">
        <span className="chore-admin-label">
          {item.label}
          {item.active === false && <span className="chore-inactive-badge"> inactive</span>}
        </span>
        <span className="chore-admin-meta">
          {item.requiresApproval ? 'Requires approval' : 'Self-purchase'}
        </span>
      </div>
      <TokenBadge amount={item.cost} />
      <button className="chore-admin-edit-btn" onClick={onEdit}>Edit</button>
      <button className="chore-admin-del-btn"  onClick={onDeleteRequest}>×</button>
    </div>
  )
}

// ── Form ──────────────────────────────────────────────────────────────────────

function StoreForm({ item, onSave, onCancel, saving }) {
  const [label,            setLabel]            = useState(item.label || '')
  const [icon,             setIcon]             = useState(item.icon || '')
  const [cost,             setCost]             = useState(item.cost ?? 5)
  const [requiresApproval, setRequiresApproval] = useState(item.requiresApproval ?? false)
  const [active,           setActive]           = useState(item.active !== false)

  function handleSave() {
    if (!label.trim()) return
    onSave({ ...item, label: label.trim(), icon, cost, requiresApproval, active })
  }

  return (
    <div className="chore-form">
      <div className="chore-form-field">
        <label className="chore-form-label">Label</label>
        <input
          className="chore-form-input"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="30 min later bedtime"
          autoFocus
        />
      </div>

      <div className="chore-form-row">
        <div className="chore-form-field">
          <label className="chore-form-label">Icon</label>
          <input
            className="chore-form-input chore-form-icon-input"
            value={icon}
            onChange={e => setIcon(e.target.value)}
            placeholder="🌙"
          />
        </div>
        <div className="chore-form-field">
          <label className="chore-form-label">Cost (Tokens)</label>
          <input
            className="chore-form-input"
            type="number"
            min="1"
            value={cost}
            onChange={e => setCost(Math.max(1, Number(e.target.value) || 1))}
          />
        </div>
      </div>

      <div className="chore-form-field">
        <label className="chore-form-label">Purchase type</label>
        <div className="chore-form-toggle">
          <button
            className={!requiresApproval ? 'active' : ''}
            onClick={() => setRequiresApproval(false)}
          >
            Self-purchase
          </button>
          <button
            className={requiresApproval ? 'active' : ''}
            onClick={() => setRequiresApproval(true)}
          >
            Ask a grown up
          </button>
        </div>
        <p className="chore-form-hint" style={{ marginTop: 4 }}>
          {requiresApproval
            ? 'Kids see the item and are prompted to ask a parent. No automatic deduction.'
            : 'Kids can purchase this on their own. Tokens deducted immediately.'}
        </p>
      </div>

      {item.id && (
        <div className="chore-form-field">
          <label className="chore-form-label">Status</label>
          <button
            className={`chore-form-toggle-single ${active ? 'active' : ''}`}
            onClick={() => setActive(a => !a)}
          >
            {active ? 'Active — visible in store' : 'Inactive — hidden from kids'}
          </button>
        </div>
      )}

      <div className="chore-form-actions">
        <button
          className="parent-apply-btn"
          onClick={handleSave}
          disabled={saving || !label.trim()}
        >
          {saving ? 'Saving…' : (item.id ? 'Save Changes' : 'Add Item')}
        </button>
        <button className="btn-cancel-spend" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ── Award an item ─────────────────────────────────────────────────────────────

function AwardItem({ items, children, onAwarded }) {
  const [child,    setChild]    = useState(children[0]?.name ?? '')
  const [itemId,   setItemId]   = useState('')
  const [awarding, setAwarding] = useState(false)
  const [flash,    setFlash]    = useState(false)

  const approvalItems = items.filter(i => i.active !== false && i.requiresApproval)
  const selectedItem  = approvalItems.find(i => i.id === itemId)

  async function handleAward() {
    if (!child || !itemId) return
    setAwarding(true)
    await buyReward(child, itemId)
    setAwarding(false)
    setItemId('')
    setFlash(true)
    setTimeout(() => setFlash(false), 2000)
    onAwarded()
  }

  if (approvalItems.length === 0) return null

  return (
    <div className="award-form">
      <p className="award-heading">Award a Purchase</p>

      <div className="award-row">
        <select
          className="award-select"
          value={child}
          onChange={e => setChild(e.target.value)}
        >
          {children.map(c => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))}
        </select>

        <select
          className="award-select"
          value={itemId}
          onChange={e => setItemId(e.target.value)}
        >
          <option value="">Pick an item…</option>
          {approvalItems.map(i => (
            <option key={i.id} value={i.id}>{i.icon} {i.label} ({i.cost} tokens)</option>
          ))}
        </select>

        <button
          className="redemptions-btn"
          onClick={handleAward}
          disabled={awarding || !itemId}
          style={flash ? { background: 'var(--accent-sage)' } : {}}
        >
          {flash ? 'Awarded!' : awarding ? '…' : 'Award'}
        </button>
      </div>

      {selectedItem && (
        <p className="award-hint">
          Deducts {selectedItem.cost} tokens from {child} and adds to their wallet.
        </p>
      )}
    </div>
  )
}

// ── Pending Redemptions ───────────────────────────────────────────────────────

function PendingRedemptions({ items, children }) {
  const { purchases, loading, reload } = usePurchases()
  const [redeeming, setRedeeming] = useState(null)

  async function handleRedeem(id) {
    setRedeeming(id)
    await redeemPurchase(id)
    setRedeeming(null)
    reload()
  }

  return (
    <>
      <AwardItem items={items} children={children} onAwarded={reload} />

      <p className="chore-inactive-heading" style={{ marginTop: 20 }}>Pending Redemptions</p>

      {loading && <p className="parent-soon-msg">Loading…</p>}

      {!loading && purchases.length === 0 && (
        <p className="parent-soon-msg">No unredeemed purchases.</p>
      )}

      {!loading && (() => {
        const byChild = {}
        children.forEach(c => { byChild[c.name] = [] })
        purchases.forEach(p => {
          if (!byChild[p.child]) byChild[p.child] = []
          byChild[p.child].push(p)
        })
        return Object.entries(byChild).filter(([, ps]) => ps.length > 0).map(([childName, ps]) => (
          <div key={childName} className="redemptions-child">
            <p className="redemptions-child-name">{childName}</p>
            {ps.map(p => (
              <div key={p.id} className="redemptions-row">
                <span className="redemptions-icon">{p.itemIcon || '🎁'}</span>
                <span className="redemptions-label">{p.item_label}</span>
                <TokenBadge amount={p.cost} />
                <button
                  className="redemptions-btn"
                  onClick={() => handleRedeem(p.id)}
                  disabled={redeeming === p.id}
                >
                  {redeeming === p.id ? '…' : 'Redeem'}
                </button>
              </div>
            ))}
          </div>
        ))
      })()}
    </>
  )
}

// ── Tab root ──────────────────────────────────────────────────────────────────

export default function ParentRewardsTab({ children = [] }) {
  const labels = useLabels()
  const [items,         setItems]         = useState([])
  const [loading,       setLoading]       = useState(true)
  const [form,          setForm]          = useState(null)
  const [saving,        setSaving]        = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [section,       setSection]       = useState('store')

  const load = useCallback(async () => {
    setLoading(true)
    const data = await adminGetAllRewards()
    setItems(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave(data) {
    setSaving(true)
    if (data.id) await adminEditReward(data)
    else         await adminAddReward(data)
    setSaving(false)
    await load()
    setForm(null)
  }

  async function handleDelete(id) {
    await adminDeleteReward(id)
    setDeleteConfirm(null)
    await load()
  }

  if (form !== null) {
    return (
      <StoreForm
        item={form}
        onSave={handleSave}
        onCancel={() => setForm(null)}
        saving={saving}
      />
    )
  }

  const active   = items.filter(i => i.active !== false)
  const inactive = items.filter(i => i.active === false)

  return (
    <div className="parent-chores-tab">
      <TabGuide summary={`How the ${labels.rewardsName} works`}>
        <p className="onboarding-guide-text">
          The {labels.rewardsName} is what kids spend {labels.tokenName} on. Add the rewards you’ll
          offer and set each one’s cost; they show up for kids to redeem from their card. Flag a
          reward as needing approval if you want the final say before it’s cashed in.
        </p>
      </TabGuide>

      <div className="store-section-toggle">
        <button
          className={section === 'store' ? 'active' : ''}
          onClick={() => setSection('store')}
        >
          Store Items
        </button>
        <button
          className={section === 'redeem' ? 'active' : ''}
          onClick={() => setSection('redeem')}
        >
          Redeem
        </button>
      </div>

      {section === 'store' && (
        <>
          <button className="parent-add-chore-btn" onClick={() => setForm(emptyItem())}>
            + Add Item
          </button>

          {loading && <p className="parent-soon-msg">Loading store…</p>}

          {!loading && items.length === 0 && (
            <p className="parent-soon-msg">No items yet. Add one above.</p>
          )}

          {!loading && active.map(item => (
            <StoreRow
              key={item.id}
              item={item}
              confirmDelete={deleteConfirm === item.id}
              onEdit={() => setForm({ ...item })}
              onDeleteRequest={() => setDeleteConfirm(item.id)}
              onConfirmDelete={() => handleDelete(item.id)}
              onCancelDelete={() => setDeleteConfirm(null)}
            />
          ))}

          {!loading && inactive.length > 0 && (
            <>
              <p className="chore-inactive-heading">Inactive</p>
              {inactive.map(item => (
                <StoreRow
                  key={item.id}
                  item={item}
                  confirmDelete={deleteConfirm === item.id}
                  onEdit={() => setForm({ ...item })}
                  onDeleteRequest={() => setDeleteConfirm(item.id)}
                  onConfirmDelete={() => handleDelete(item.id)}
                  onCancelDelete={() => setDeleteConfirm(null)}
                />
              ))}
            </>
          )}
        </>
      )}

      {section === 'redeem' && <PendingRedemptions items={items} children={children} />}
    </div>
  )
}

import { useState, useEffect } from 'react'
import SpinningWheel from './SpinningWheel'
import TokenBadge from './TokenBadge'
import ChildIcon from './ChildIcon'
import { assignChores, acceptChoresToApi, getClaimedChoreIds, triggerChoreRefetch } from '../hooks/useAssignedChores'
import { isChoreAvailableThisWeek } from '../hooks/useChoreFrequency'
import { useLabels, useSettings } from '../FamilyContext'

const PHASE = { READY: 'ready', CHOOSE: 'choose' }

function todayName() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' })
}

// Floor of 1 so a chore saved with 0 tokens can't pad a bundle for free.
function tokenValue(chore) {
  return Math.max(1, chore.tokens ?? 1)
}

function pickRandom(pool) {
  return pool[Math.floor(Math.random() * pool.length)]
}

// `tokenTarget` is passed explicitly by ChildView, which renders outside the
// FamilyProvider and so can't read settings from context.
export default function ChoreModal({ child, chores = [], onClose, isExtra = false, tokenTarget }) {
  const labels   = useLabels()
  const settings = useSettings()
  const target   = tokenTarget ?? settings.chores.dailyTokenTarget
  const [phase,        setPhase]        = useState(PHASE.READY)
  const [firstBundle,  setFirstBundle]  = useState([])
  const [secondBundle, setSecondBundle] = useState([])
  const [spinning,     setSpinning]     = useState(false)

  function filteredPool(excludeIds = []) {
    const claimed = getClaimedChoreIds(child.name)
    const today   = todayName()
    return chores.filter(c =>
      c.active !== false &&
      !c.required &&
      (c.days.length === 0 || c.days.includes(today)) &&
      isChoreAvailableThisWeek(c, child.name) &&
      !claimed.has(c.id) &&
      !excludeIds.includes(c.id)
    )
  }

  // Outcome-driven: a bundle is topped up with more chores until it's worth the
  // family's daily target, so every option on offer is the same amount of work.
  function buildBundle(firstChore, excludeIds = []) {
    const bundle  = [firstChore]
    const exclude = [...excludeIds, firstChore.id]
    let total     = tokenValue(firstChore)

    while (total < target) {
      // Only chores that fit the remaining gap, so a bundle can't overshoot.
      const pool = filteredPool(exclude).filter(c => tokenValue(c) <= target - total)
      if (!pool.length) break
      const next = pickRandom(pool)
      bundle.push(next)
      exclude.push(next.id)
      total += tokenValue(next)
    }
    return bundle
  }

  // One spin produces both options: the wheel picks bundle A's opener, and B is
  // built from whatever's left. A pool too small for a second bundle just yields
  // one option rather than blocking the spin.
  function handleSpinEnd(firstChore) {
    setSpinning(false)
    const a    = buildBundle(firstChore)
    const rest = filteredPool(a.map(c => c.id))
    const b    = rest.length ? buildBundle(pickRandom(rest), a.map(c => c.id)) : []
    setFirstBundle(a)
    setSecondBundle(b)
    setPhase(PHASE.CHOOSE)
  }

  function handleAccept(bundle) {
    const mapped = bundle.map(c => ({ ...c, completed: false, ...(isExtra && { extra: true }) }))
    assignChores(child.name, mapped)
    onClose()
    acceptChoresToApi(child, mapped).then(() => triggerChoreRefetch())
  }

  const activePool  = filteredPool()
  const isSpinPhase = phase === PHASE.READY
  const bundles     = [firstBundle, secondBundle].filter(b => b.length > 0)
  const totals      = bundles.map(b => b.reduce((sum, c) => sum + tokenValue(c), 0))
  // A bundle falls short of the target when the pool runs dry, so the options
  // aren't always equal — only claim they are when they actually are.
  const sameValue   = totals.length > 1 && totals.every(t => t === totals[0])

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-child-header">
          <div className="modal-avatar" style={{ background: child.color }}>
            <ChildIcon name={child.icon} size={22} />
          </div>
          <div>
            <h2 className="modal-title">{isExtra ? 'Bonus Chore' : `${child.name}'s Chore`}</h2>
            {isExtra && <p className="modal-subtitle">Earns {labels.tokenName} only</p>}
          </div>
        </div>

        {/* ── CHOOSE phase: pick one of two bundles ── */}
        {phase === PHASE.CHOOSE && (
          <div className="chore-choose-panel">
            <p className="chore-choose-label">
              {bundles.length < 2
                ? 'Your chores:'
                : sameValue
                  ? `Pick one — both are worth the same number of ${labels.tokenName.toLowerCase()}:`
                  : 'Pick one:'}
            </p>
            <div className="chore-choose-bundles">
              {bundles.map((bundle, i) => (
                <button key={i} className="chore-bundle-btn" onClick={() => handleAccept(bundle)}>
                  {bundle.map(c => (
                    <div key={c.id} className="chore-bundle-item">
                      <span className="chore-result-icon">{c.icon}</span>
                      <span className="chore-result-name">{c.label}</span>
                      <TokenBadge amount={c.tokens} />
                    </div>
                  ))}
                  {bundle.length > 1 && (
                    <span className="chore-bundle-total">
                      {totals[i]} {labels.tokenName.toLowerCase()} total
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── READY phase: the wheel ── */}
        {phase !== PHASE.CHOOSE && (
          <>
            {activePool.length === 0 ? (
              <div className="modal-loading">
                No chores available today
              </div>
            ) : (
              <div className={`modal-wheel-wrap ${!isSpinPhase ? 'dimmed' : ''}`}>
                <SpinningWheel
                  key={phase}
                  chores={activePool}
                  onSpinStart={() => setSpinning(true)}
                  onSpinEnd={handleSpinEnd}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

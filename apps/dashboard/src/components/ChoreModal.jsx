import { useState, useEffect } from 'react'
import SpinningWheel from './SpinningWheel'
import TokenBadge from './TokenBadge'
import ChildIcon from './ChildIcon'
import { assignChores, acceptChoresToApi, getClaimedChoreIds, triggerChoreRefetch } from '../hooks/useAssignedChores'
import { isChoreAvailableThisWeek } from '../hooks/useChoreFrequency'
import { useLabels } from '../FamilyContext'

const PHASE = { READY: 'ready', RESULT: 'result', RESPIN: 'respin', CHOOSE: 'choose' }

function todayName() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' })
}

export default function ChoreModal({ child, chores = [], onClose, isExtra = false }) {
  const labels = useLabels()
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

  // Outcome-driven: a 2-token chore wins the spin on its own; a 1-token chore
  // brings along a second 1-token chore — so every spin is ~2 tokens of work.
  function buildBundle(firstChore, excludeIds = []) {
    if (firstChore.tokens >= 2) return [firstChore]
    const pool   = filteredPool([...excludeIds, firstChore.id]).filter(c => c.tokens === 1)
    const second = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null
    return second ? [firstChore, second] : [firstChore]
  }

  function handleSpinEnd(firstChore) {
    setSpinning(false)
    if (phase === PHASE.READY) {
      setFirstBundle(buildBundle(firstChore))
      setPhase(PHASE.RESULT)
    } else if (phase === PHASE.RESPIN) {
      setSecondBundle(buildBundle(firstChore, firstBundle.map(c => c.id)))
      setPhase(PHASE.CHOOSE)
    }
  }

  function handleAccept(bundle) {
    const mapped = bundle.map(c => ({ ...c, completed: false, ...(isExtra && { extra: true }) }))
    assignChores(child.name, mapped)
    onClose()
    acceptChoresToApi(child, mapped).then(() => triggerChoreRefetch())
  }

  function handleSpinAgain() {
    setPhase(PHASE.RESPIN)
  }

  const firstPool   = filteredPool()
  const respinPool  = filteredPool(firstBundle.map(c => c.id))
  const activePool  = phase === PHASE.RESPIN ? respinPool : firstPool
  const isSpinPhase = phase === PHASE.READY || phase === PHASE.RESPIN

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
            <p className="chore-choose-label">Pick your bundle:</p>
            <div className="chore-choose-bundles">
              {[firstBundle, secondBundle].map((bundle, i) => (
                <button key={i} className="chore-bundle-btn" onClick={() => handleAccept(bundle)}>
                  {bundle.map(c => (
                    <div key={c.id} className="chore-bundle-item">
                      <span className="chore-result-icon">{c.icon}</span>
                      <span className="chore-result-name">{c.label}</span>
                      <TokenBadge amount={c.tokens} />
                    </div>
                  ))}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── READY / RESULT / RESPIN phases: wheel + result ── */}
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

            {phase === PHASE.RESPIN && (
              <p className="chore-respin-hint">Spin #2 — then choose your favorite!</p>
            )}

            {phase === PHASE.RESULT && firstBundle.length > 0 && (
              <div className="chore-result-panel">
                <div className="chore-result-cards">
                  {firstBundle.map(chore => (
                    <div key={chore.id} className="chore-result-card">
                      <span className="chore-result-icon">{chore.icon}</span>
                      <span className="chore-result-name">{chore.label}</span>
                      <TokenBadge amount={chore.tokens} />
                    </div>
                  ))}
                </div>
                <div className="chore-result-actions">
                  <button className="btn-complete" onClick={() => handleAccept(firstBundle)}>
                    ✓ These are my chores!
                  </button>
                  {respinPool.length > 0 && (
                    <button className="btn-spin-again" onClick={handleSpinAgain}>
                      Spin Again
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

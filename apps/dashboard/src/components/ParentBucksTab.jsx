import { useState } from 'react'
import { useChorePoints } from '../hooks/useChores'
import { useScreenBalance } from '../hooks/useScreenTime'
import BuckBadge from './BuckBadge'

const TIME_PRESETS = [-30, -15, +15, +30]

function ChildRow({ child }) {
  const { bucks, adjustBucks }  = useChorePoints(child.name)
  const { balance, purchasedBalance, addMinutes } = useScreenBalance(child.name)
  const [buckDelta, setBuckDelta] = useState(0)
  const [flash, setFlash]         = useState('')

  function pulse(which) {
    setFlash(which)
    setTimeout(() => setFlash(''), 1000)
  }

  function applyBucks() {
    if (buckDelta === 0) return
    adjustBucks(buckDelta)
    setBuckDelta(0)
    pulse('bucks')
  }

  function applyTime(delta) {
    const actual = delta < 0 ? Math.max(delta, -purchasedBalance) : delta
    if (actual === 0) return
    addMinutes(actual)
    pulse('time')
  }

  function stepBuck(dir) {
    setBuckDelta(d => {
      const next = d + dir
      if (dir < 0 && next < -bucks) return d
      if (next === 0) return dir > 0 ? 1 : -1
      return next
    })
  }

  return (
    <div className="parent-child-card">
      <div className="parent-child-hd">
        <div className="parent-child-avatar" style={{ background: child.color }}>{child.emoji}</div>
        <span className="parent-child-name">{child.name}</span>
      </div>

      {/* Bucks */}
      <div className="parent-section">
        <div className="parent-section-row">
          <span className="parent-section-label">Beagley Bucks</span>
          <span className={`parent-balance ${flash === 'bucks' ? 'flashed' : ''}`}>
            <BuckBadge amount={bucks} />
          </span>
        </div>
        <div className="parent-stepper-row">
          <button className="stepper-btn" onClick={() => stepBuck(-1)} disabled={buckDelta <= -bucks && bucks > 0}>−</button>
          <span className={`stepper-value adjust-value ${buckDelta > 0 ? 'adding' : buckDelta < 0 ? 'deducting' : ''}`} style={{ fontSize: '26px', minWidth: '56px' }}>
            {buckDelta > 0 ? `+${buckDelta}` : buckDelta}
          </span>
          <button className="stepper-btn" onClick={() => stepBuck(1)}>+</button>
          <button className="parent-apply-btn" onClick={applyBucks} disabled={buckDelta === 0}>
            Apply
          </button>
        </div>
      </div>

      {/* Screen Time */}
      <div className="parent-section">
        <div className="parent-section-row">
          <span className="parent-section-label">Screen Time</span>
          <span className={`parent-balance ${flash === 'time' ? 'flashed' : ''}`}>
            {balance} min
          </span>
        </div>
        <div className="parent-time-row">
          {TIME_PRESETS.map(d => (
            <button
              key={d}
              className={`parent-time-btn ${d < 0 ? 'deduct' : 'add'}`}
              onClick={() => applyTime(d)}
              disabled={d < 0 && purchasedBalance === 0}
            >
              {d > 0 ? `+${d}` : d}m
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ParentBucksTab({ children = [] }) {
  return (
    <div className="parent-bucks-tab">
      {children.map(child => (
        <ChildRow key={child.name} child={child} />
      ))}
    </div>
  )
}

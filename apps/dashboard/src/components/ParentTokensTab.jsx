import { useState } from 'react'
import { useChorePoints } from '../hooks/useChores'
import { useScreenBalance } from '../hooks/useScreenTime'
import { useLabels } from '../FamilyContext'
import TokenBadge from './TokenBadge'
import ChildIcon from './ChildIcon'

const TIME_PRESETS = [-30, -15, +15, +30]

function ChildRow({ child }) {
  const labels = useLabels()
  const { tokens, adjustTokens }  = useChorePoints(child.name)
  const { balance, purchasedBalance, addMinutes } = useScreenBalance(child.name)
  const [tokenDelta, setTokenDelta] = useState(0)
  const [flash, setFlash]         = useState('')

  function pulse(which) {
    setFlash(which)
    setTimeout(() => setFlash(''), 1000)
  }

  function applyTokens() {
    if (tokenDelta === 0) return
    adjustTokens(tokenDelta)
    setTokenDelta(0)
    pulse('tokens')
  }

  function applyTime(delta) {
    const actual = delta < 0 ? Math.max(delta, -purchasedBalance) : delta
    if (actual === 0) return
    addMinutes(actual)
    pulse('time')
  }

  function stepToken(dir) {
    setTokenDelta(d => {
      const next = d + dir
      if (dir < 0 && next < -tokens) return d
      if (next === 0) return dir > 0 ? 1 : -1
      return next
    })
  }

  return (
    <div className="parent-child-card">
      <div className="parent-child-hd">
        <div className="parent-child-avatar" style={{ background: child.color }}><ChildIcon name={child.icon} size={22} /></div>
        <span className="parent-child-name">{child.name}</span>
      </div>

      {/* Tokens */}
      <div className="parent-section">
        <div className="parent-section-row">
          <span className="parent-section-label">{labels.tokenName}</span>
          <span className={`parent-balance ${flash === 'tokens' ? 'flashed' : ''}`}>
            <TokenBadge amount={tokens} />
          </span>
        </div>
        <div className="parent-stepper-row">
          <button className="stepper-btn" onClick={() => stepToken(-1)} disabled={tokenDelta <= -tokens && tokens > 0}>−</button>
          <span className={`stepper-value adjust-value ${tokenDelta > 0 ? 'adding' : tokenDelta < 0 ? 'deducting' : ''}`} style={{ fontSize: '26px', minWidth: '56px' }}>
            {tokenDelta > 0 ? `+${tokenDelta}` : tokenDelta}
          </span>
          <button className="stepper-btn" onClick={() => stepToken(1)}>+</button>
          <button className="parent-apply-btn" onClick={applyTokens} disabled={tokenDelta === 0}>
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

export default function ParentTokensTab({ children = [] }) {
  return (
    <div className="parent-tokens-tab">
      {children.map(child => (
        <ChildRow key={child.name} child={child} />
      ))}
    </div>
  )
}

import { useRef, useState, useEffect } from 'react'
import { Monitor, Coins } from 'lucide-react'
import RoutineItem from './RoutineItem'
import ChildIcon from './ChildIcon'
import Confetti from './Confetti'
import ChoreInstructionsModal from './ChoreInstructionsModal'
import { useScreenBalance, stopChildTimer } from '../hooks/useScreenTime'
import { useChorePoints, markChoreToday } from '../hooks/useChores'
import { useAssignedChores, markChoreAsPending, submitApprovalRequest, triggerChoreRefetch } from '../hooks/useAssignedChores'
import { recordChoreCompletion } from '../hooks/useChoreFrequency'
import { startChimeLoop, stopChimeLoop } from '../utils/chime'
import { CONFIG } from '../config/config'
import { useLabels } from '../FamilyContext'
import ZoneCard from './ZoneCard'

const COOLDOWN_MESSAGES = [
  "Nice try, speedy.",
  "That was fast. Probably too fast.",
  "The chore fairy isn't convinced.",
  "Already? Really?",
  "Not yet, amigo.",
  "Cool your jets.",
  "Go check one more time and come back in a few minutes.",
  "The clock says no.",
]

function isChoreDay(scheduleConfig) {
  // Per-family spin days as weekday numbers (0=Sun..6=Sat). Undefined = every day.
  const days = scheduleConfig?.spinDays
  if (!Array.isArray(days)) return true
  return days.includes(new Date().getDay())
}

function SkeletonList() {
  return (
    <div className="skeleton-list">
      {[88, 72, 80].map((w, i) => (
        <div key={i} className="skeleton-row" style={{ width: `${w}%` }} />
      ))}
    </div>
  )
}

export default function ChildCard({ child, now, routines, routinesLoading, chores, choresLoading, onToggle, onSpin, onExtraSpin, onScreenTime, onTokens, onUpcoming, timer, scheduleConfig }) {
  const { chores: assignedChores, loading: assignedLoading } = useAssignedChores(child.name, chores)
  const { balance } = useScreenBalance(child.name)
  const { tokens }   = useChorePoints(child.name)
  const labels = useLabels()
  const choreDay = isChoreDay(scheduleConfig)

  const isLoading = routinesLoading || choresLoading || assignedLoading

  const cooldownMs = (CONFIG.choreCooldownMinutes ?? 5) * 60 * 1000
  function cooldownMinsRemaining(chore) {
    if (chore.required || !chore.acceptedAt) return 0
    const elapsed = Date.now() - new Date(chore.acceptedAt).getTime()
    return Math.max(0, Math.ceil((cooldownMs - elapsed) / 60000))
  }

  const requiredChores = assignedChores.filter(c => c.required)
  const spinChores     = assignedChores.filter(c => !c.required)

  const canInitialSpin = spinChores.length === 0
  const canExtraSpin   = spinChores.length > 0 && spinChores.every(c => c.pending || c.completed)
  const spinBlocked    = spinChores.length > 0 && !spinChores.every(c => c.pending || c.completed)

  const allItems = [...routines, ...requiredChores, ...(choreDay ? spinChores : [])]
  const done     = allItems.filter(r => r.completed).length
  const total    = allItems.length
  const allDone  = total > 0 && done === total
  const progress = total > 0 ? (done / total) * 100 : 0

  const prevAllDone = useRef(allDone)
  const [confettiKey, setConfettiKey] = useState(0)
  useEffect(() => {
    if (!prevAllDone.current && allDone) setConfettiKey(k => k + 1)
    prevAllDone.current = allDone
  }, [allDone])

  useEffect(() => {
    if (timer?.expired) startChimeLoop()
    else stopChimeLoop()
    return stopChimeLoop
  }, [timer?.expired])

  const [instructionsChore, setInstructionsChore] = useState(null)
  const [submitting, setSubmitting] = useState(new Set())
  const [cooldownToast, setCooldownToast] = useState(null)

  async function handleChoreRequest(chore) {
    if (submitting.has(chore.id)) return
    setSubmitting(prev => new Set([...prev, chore.id]))
    try {
      markChoreAsPending(child.name, chore.id)
      markChoreToday(child.name)
      recordChoreCompletion(child.name, chore.id, chore.required)
      await submitApprovalRequest(child, chore.id, chore.label, chore.tokens)
      triggerChoreRefetch()
    } finally {
      setSubmitting(prev => { const next = new Set(prev); next.delete(chore.id); return next })
    }
  }

  function handleChoreTap(chore) {
    if (chore.completed || chore.pending || submitting.has(chore.id)) return
    if (cooldownMinsRemaining(chore) > 0) {
      const msg = COOLDOWN_MESSAGES[Math.floor(Math.random() * COOLDOWN_MESSAGES.length)]
      setCooldownToast(msg)
      setTimeout(() => setCooldownToast(null), 3000)
      return
    }
    if (chore.instructions?.length) setInstructionsChore(chore)
    else handleChoreRequest(chore)
  }

  return (
    <div
      className={`child-card ${allDone ? 'all-done' : ''}`}
      style={{ '--child-color': child.color, background: `color-mix(in srgb, ${child.color} 30%, #F2EDE4)`, position: 'relative' }}
    >
      <Confetti triggerKey={confettiKey} />

      {/* Header */}
      <div className="child-header">
        <div className="child-meta">
          <h3 className="child-name">{child.name}</h3>
          <span className="child-progress-text">
            {isLoading ? 'Syncing…' : total === 0 ? 'Nothing assigned yet' : allDone ? 'All done! ✓' : `${done} of ${total}`}
          </span>
        </div>

        <div className="child-header-right">
          {timer && (
            <div className={`child-timer-pill ${timer.expired ? 'expired' : ''}`}>
              {timer.expired ? (
                <span className="child-timer-label">Time's up!</span>
              ) : (
                <>
                  <span className="child-timer-dot" />
                  <span className="child-timer-label">
                    {timer.minutes}:{String(timer.seconds).padStart(2, '0')}
                  </span>
                </>
              )}
              <button
                className="child-timer-stop"
                onClick={() => { stopChimeLoop(); stopChildTimer(child.name) }}
                aria-label="Stop timer"
              >×</button>
            </div>
          )}

          <button
            className={`child-icon-btn ${balance > 0 ? 'has-balance' : ''}`}
            onClick={onScreenTime}
            title={balance > 0 ? `${balance} min screen time` : 'Screen Time'}
          >
            <Monitor size={16} strokeWidth={1.8} />
            {balance > 0 && <span className="child-icon-badge">{balance}m</span>}
          </button>

          <button
            className="child-icon-btn tokens-icon-btn"
            onClick={onTokens}
            title={`${tokens} ${labels.tokenName}`}
          >
            <Coins size={16} strokeWidth={1.8} />
            {tokens > 0 && <span className="child-icon-badge">{tokens}</span>}
          </button>

          <div className="child-avatar" style={{ background: child.color }}>
            <ChildIcon name={child.icon} size={26} />
          </div>
        </div>
      </div>

      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${progress}%`, background: child.color }} />
      </div>

      <ZoneCard child={child} now={now} />

      {/* Routine list */}
      <div className="routine-list">
        {isLoading ? (
          <SkeletonList />
        ) : (
          <>
            {routines.map(r => (
              <RoutineItem key={r.id} routine={r} onToggle={() => onToggle(child.name, r.id)} />
            ))}
            {requiredChores.map(chore => (
              <RoutineItem
                key={chore.id}
                routine={chore}
                onToggle={() => handleChoreTap(chore)}
              />
            ))}
            {choreDay && spinChores.map(chore => (
              <RoutineItem
                key={chore.id}
                routine={{ ...chore, cooldownMins: cooldownMinsRemaining(chore) }}
                onToggle={() => handleChoreTap(chore)}
              />
            ))}
          </>
        )}
      </div>

      {/* Bottom pills */}
      <div className="child-card-pills">
        <button
          className="child-pill chore-pill"
          onClick={choreDay && !spinBlocked ? (canInitialSpin ? onSpin : canExtraSpin ? onExtraSpin : undefined) : undefined}
          disabled={!choreDay || spinBlocked}
          style={{ '--child-color': child.color }}
        >
          🎡 chore spinner
        </button>
        <button className="child-pill upcoming-pill" onClick={onUpcoming}>
          upcoming
        </button>
      </div>

      {cooldownToast && (
        <div className="cooldown-toast">{cooldownToast}</div>
      )}

      {instructionsChore && (
        <ChoreInstructionsModal
          chore={instructionsChore}
          onComplete={() => { handleChoreRequest(instructionsChore); setInstructionsChore(null) }}
          onClose={() => setInstructionsChore(null)}
        />
      )}
    </div>
  )
}

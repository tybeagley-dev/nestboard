import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import ChildIcon from './components/ChildIcon'
import Confetti from './components/Confetti'
import PinModal from './components/PinModal'
import { isChildTrusted, trustChild } from './utils/childTrust'
import { useLiveSync } from './hooks/useLiveSync'
import { setFamilySlug } from './utils/api'
import { useChildren } from './hooks/useChildren'
import { useClock } from './hooks/useClock'
import { useRoutines, useScheduleConfig } from './hooks/useRoutines'
import { useChores, useChorePoints } from './hooks/useChores'
import { useAssignedChores, markChoreAsPending, submitApprovalRequest, triggerChoreRefetch } from './hooks/useAssignedChores'
import { useScreenBalance } from './hooks/useScreenTime'
import { useFamilyPayload } from './hooks/useFamilySettings'
import { FamilyProvider, useSettings, useLabels } from './FamilyContext'
import TokensModal from './components/TokensModal'
import ScreenTimeModal from './components/ScreenTimeModal'
import { useActiveChildTimers, stopChildTimer } from './hooks/useScreenTime'
import { stopChimeLoop } from './utils/chime'
import { useCalendarEvents } from './hooks/useCalendarEvents'
import { useGroceryList } from './hooks/useGroceryList'
import { useWeather } from './hooks/useWeather'
import { useMeals } from './hooks/useMeals'
import { recordChoreCompletion } from './hooks/useChoreFrequency'
import { markChoreToday } from './hooks/useChores'
import RoutineItem from './components/RoutineItem'
import ChoreModal from './components/ChoreModal'
import ChoreInstructionsModal from './components/ChoreInstructionsModal'
import DeviceSetupModal from './components/DeviceSetupModal'
import UpcomingModal from './components/UpcomingModal'
import WeatherCard from './components/WeatherCard'
import MealPlan from './components/MealPlan'
import { getDayName } from './utils/dateUtils'
import { getCurrentScheduleMode } from './utils/scheduleUtils'
import { CONFIG } from './config/config'
import { Monitor, Coins } from 'lucide-react'

function isChoreDay() {
  return new Date().getDay() !== 0
}

function GroceryAdd({ addItem }) {
  const [text, setText] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    addItem(text)
    setText('')
  }

  return (
    <form className="child-grocery-form" onSubmit={handleSubmit}>
      <input
        className="child-grocery-input"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Add to grocery list…"
      />
      <button className="child-grocery-btn" type="submit" disabled={!text.trim()}>Add</button>
    </form>
  )
}

// Device-level gate: the child route is unauthenticated, so an untrusted device
// must enter the family PIN once before ChildView mounts (and before any child
// data is fetched). Gating in this wrapper keeps ChildView's hook order intact.
export default function ChildView() {
  const { slug } = useParams()

  // Set the slug header synchronously so PinModal's /auth/parent call is scoped.
  setFamilySlug(slug)

  const [trusted, setTrusted] = useState(() => isChildTrusted(slug))

  if (!trusted) {
    // Non-dismissable: there's no "escape" past the gate on a child device.
    return (
      <div className="child-view-loading">
        <PinModal
          prompt="Enter family PIN"
          dismissable={false}
          onSuccess={() => { trustChild(slug); setTrusted(true) }}
          onCancel={() => {}}
        />
      </div>
    )
  }

  return <ChildViewFamily />
}

// Supplies a real FamilyProvider so everything below sees the family's own labels
// and settings. Without it, kiosk components mounted here fall back to generic
// defaults — showing the wrong token name and the wrong screen-time price while
// the server charges the real one.
function ChildViewFamily() {
  const family = useFamilyPayload()
  return (
    <FamilyProvider family={family}>
      <ChildViewInner />
    </FamilyProvider>
  )
}

function ChildViewInner() {
  const { slug, childId } = useParams()

  // Must be synchronous so the slug header is set before any hook fires its first fetch
  setFamilySlug(slug)

  useLiveSync(slug)

  const now              = useClock()
  const { children }     = useChildren()
  const { scheduleConfig } = useScheduleConfig()
  const { chores }       = useChores()
  const weather          = useWeather()
  const { addItem }      = useGroceryList()

  const child = children.find(c => c.id === childId)

  const { routinesByChild, toggleRoutine } = useRoutines(now, child ? [child] : [], scheduleConfig)
  const routines = child ? (routinesByChild[child.name] ?? []) : []

  const { chores: assignedChores, loading: assignedLoading } = useAssignedChores(child?.name ?? '', chores, child?.id ?? null)
  const { balance }  = useScreenBalance(child?.name ?? '')
  const { tokens }    = useChorePoints(child?.name ?? '')
  const { modules }   = useSettings()
  const labels        = useLabels()

  // Families without a stationary kiosk have this page as their only interactive
  // surface, so the balance pills open the same modals the kiosk uses.
  const [showTokens,     setShowTokens]     = useState(false)
  const [showScreenTime, setShowScreenTime] = useState(false)

  const activeTimers = useActiveChildTimers()
  const timer = activeTimers.find(t => t.child === child?.name) ?? null

  const [showChoreModal,  setShowChoreModal]  = useState(false)
  const [showUpcoming,    setShowUpcoming]    = useState(false)
  const [showSetup,       setShowSetup]       = useState(false)
  const [instructionsChore, setInstructionsChore] = useState(null)
  const [submitting,      setSubmitting]      = useState(new Set())

  const requiredChores = assignedChores.filter(c => c.required)
  const spinChores     = assignedChores.filter(c => !c.required)

  // Chores only, matching the kiosk card — routines carry their own checkmarks.
  const choreItems = [...requiredChores, ...(isChoreDay() ? spinChores : [])]
  const total      = choreItems.length
  const done       = choreItems.filter(c => c.completed).length
  const awaiting   = choreItems.filter(c => !c.completed && c.pending).length
  const dayItems   = [...routines, ...choreItems]
  const everythingDone = dayItems.length > 0 && dayItems.every(i => i.completed)

  // Same rule as the kiosk card: chores *and* routines, not the progress number.
  const prevAllDone = useRef(everythingDone)
  const [confettiKey, setConfettiKey] = useState(0)
  useEffect(() => {
    if (!prevAllDone.current && everythingDone) setConfettiKey(k => k + 1)
    prevAllDone.current = everythingDone
  }, [everythingDone])

  if (!child) {
    return (
      <div className="child-view-loading">
        {children.length === 0 ? 'Loading…' : 'Child not found.'}
      </div>
    )
  }

  const canSpin = spinChores.length === 0 || spinChores.every(c => c.pending || c.completed)

  // Spin chores can't be submitted until the cooldown since accepting them elapses
  // (matches the kiosk card). Required chores have no cooldown.
  const cooldownMs = (CONFIG.choreCooldownMinutes ?? 5) * 60 * 1000
  function cooldownMinsRemaining(chore) {
    if (chore.required || !chore.acceptedAt) return 0
    const elapsed = Date.now() - new Date(chore.acceptedAt).getTime()
    return Math.max(0, Math.ceil((cooldownMs - elapsed) / 60000))
  }

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
    if (cooldownMinsRemaining(chore) > 0) return
    if (chore.instructions?.length) setInstructionsChore(chore)
    else handleChoreRequest(chore)
  }

  return (
    <div className="child-view" style={{ '--child-color': child.color }}>
      {/* Fixed to the viewport: the page scrolls, and confetti anchored to the
          document would fall off-screen for a child scrolled down the list. */}
      <div className="child-view-confetti"><Confetti triggerKey={confettiKey} /></div>
      {/* Header */}
      <div className="child-view-header" style={{ background: child.color }}>
        <div className="child-view-avatar"><ChildIcon name={child.icon} size={48} /></div>
        <div className="child-view-name">{child.name}</div>
        <div className="child-view-progress">
          {assignedLoading
            ? 'Syncing…'
            : total === 0 ? 'No chores yet'
            : everythingDone ? 'All done!'
            : done === total ? 'Chores done ✓'
            : `${done} of ${total} done${awaiting > 0 ? ` · ${awaiting} waiting` : ''}`}
        </div>
      </div>

      {/* Balance pills — tappable, opening the same modals as the kiosk */}
      {(modules.screenTime || modules.tokens) && (
        <div className="child-view-balances">
          {modules.screenTime && (
            <button
              className="child-view-balance-pill child-view-balance-pill--action"
              onClick={() => setShowScreenTime(true)}
            >
              <Monitor size={16} strokeWidth={1.8} />
              <span>{balance} min</span>
            </button>
          )}
          {modules.tokens && (
            <button
              className="child-view-balance-pill child-view-balance-pill--action"
              onClick={() => setShowTokens(true)}
            >
              <Coins size={16} strokeWidth={1.8} />
              <span>{tokens} {labels.tokenName.toLowerCase()}</span>
            </button>
          )}
        </div>
      )}

      {/* A timer started from this page has to be visible on it — on the kiosk
          the countdown lives on ChildCard, which this page doesn't render. */}
      {timer && (
        <div className={`child-view-timer ${timer.expired ? 'expired' : ''}`}>
          {timer.expired ? (
            <span>Time's up!</span>
          ) : (
            <span>{timer.minutes}:{String(timer.seconds).padStart(2, '0')} left</span>
          )}
          <button
            className="child-view-timer-stop"
            onClick={() => { stopChimeLoop(); stopChildTimer(child.name) }}
          >
            Stop
          </button>
        </div>
      )}

      {/* Routines + chores */}
      <div className="child-view-section">
        <div className="child-view-section-title">Today's List</div>
        <div className="routine-list">
          {routines.map(r => (
            <RoutineItem key={r.id} routine={r} onToggle={() => toggleRoutine(child.name, r.id)} />
          ))}
          {requiredChores.map(chore => (
            <RoutineItem key={chore.id} routine={chore} onToggle={() => handleChoreTap(chore)} />
          ))}
          {isChoreDay() && spinChores.map(chore => (
            <RoutineItem
              key={chore.id}
              routine={{ ...chore, cooldownMins: cooldownMinsRemaining(chore) }}
              onToggle={() => handleChoreTap(chore)}
            />
          ))}
          {total === 0 && !assignedLoading && (
            <p className="child-view-empty">Nothing on the list yet.</p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="child-view-actions">
        {isChoreDay() && canSpin && (
          <button
            className="child-view-action-btn"
            style={{ background: child.color }}
            onClick={() => setShowChoreModal(true)}
          >
            🎡 Chore Spinner
          </button>
        )}
        <button
          className="child-view-action-btn child-view-action-btn--outline"
          onClick={() => setShowUpcoming(true)}
        >
          📅 Upcoming
        </button>
      </div>

      {/* Info cards */}
      <div className="child-view-section">
        <WeatherCard weather={weather} />
        {modules.meals && <MealPlan now={now} scheduleConfig={scheduleConfig} readOnly />}
      </div>

      {/* Grocery */}
      {modules.grocery && (
        <div className="child-view-section">
          <div className="child-view-section-title">Grocery List</div>
          <GroceryAdd addItem={addItem} />
        </div>
      )}

      {/* Device setup */}
      <div className="child-view-footer">
        <button className="child-view-setup-btn" onClick={() => setShowSetup(true)}>
          📱 Set up this device
        </button>
      </div>

      {/* Modals */}
      {showSetup && (
        <DeviceSetupModal
          onClose={() => setShowSetup(false)}
          childId={child.id}
          label={child.name}
          familySlug={slug}
        />
      )}
      {showChoreModal && (
        <ChoreModal
          child={child}
          chores={chores}
          tokenTarget={familySettings.chores.dailyTokenTarget}
          onClose={() => setShowChoreModal(false)}
        />
      )}
      {showUpcoming && (
        <UpcomingModal child={child} onClose={() => setShowUpcoming(false)} />
      )}

      {showScreenTime && modules.screenTime && (
        <ScreenTimeModal child={child} onClose={() => setShowScreenTime(false)} />
      )}

      {showTokens && modules.tokens && (
        <TokensModal child={child} onClose={() => setShowTokens(false)} />
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

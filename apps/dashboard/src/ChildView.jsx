import { useState } from 'react'
import { useParams } from 'react-router-dom'
import ChildIcon from './components/ChildIcon'
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
import { useFamilySettings } from './hooks/useFamilySettings'
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
    // Non-dismissable: there's no "escape" past the gate on a kid device.
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

  return <ChildViewInner />
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
  const { modules }   = useFamilySettings()

  const [showChoreModal,  setShowChoreModal]  = useState(false)
  const [showUpcoming,    setShowUpcoming]    = useState(false)
  const [showSetup,       setShowSetup]       = useState(false)
  const [instructionsChore, setInstructionsChore] = useState(null)
  const [submitting,      setSubmitting]      = useState(new Set())

  if (!child) {
    return (
      <div className="child-view-loading">
        {children.length === 0 ? 'Loading…' : 'Child not found.'}
      </div>
    )
  }

  const requiredChores = assignedChores.filter(c => c.required)
  const spinChores     = assignedChores.filter(c => !c.required)
  const canSpin        = spinChores.length === 0 || spinChores.every(c => c.pending || c.completed)

  // Spin chores can't be submitted until the cooldown since accepting them elapses
  // (matches the kiosk card). Required chores have no cooldown.
  const cooldownMs = (CONFIG.choreCooldownMinutes ?? 5) * 60 * 1000
  function cooldownMinsRemaining(chore) {
    if (chore.required || !chore.acceptedAt) return 0
    const elapsed = Date.now() - new Date(chore.acceptedAt).getTime()
    return Math.max(0, Math.ceil((cooldownMs - elapsed) / 60000))
  }

  const allItems = [...routines, ...requiredChores, ...(isChoreDay() ? spinChores : [])]
  const done     = allItems.filter(r => r.completed).length
  const total    = allItems.length

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
      {/* Header */}
      <div className="child-view-header" style={{ background: child.color }}>
        <div className="child-view-avatar"><ChildIcon name={child.icon} size={48} /></div>
        <div className="child-view-name">{child.name}</div>
        <div className="child-view-progress">
          {assignedLoading ? 'Syncing…' : total === 0 ? 'Nothing yet' : done === total ? 'All done!' : `${done} of ${total} done`}
        </div>
      </div>

      {/* Balance pills */}
      {(modules.screenTime || modules.tokens) && (
        <div className="child-view-balances">
          {modules.screenTime && (
            <div className="child-view-balance-pill">
              <Monitor size={16} strokeWidth={1.8} />
              <span>{balance} min</span>
            </div>
          )}
          {modules.tokens && (
            <div className="child-view-balance-pill">
              <Coins size={16} strokeWidth={1.8} />
              <span>{tokens} tokens</span>
            </div>
          )}
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
        {modules.meals && <MealPlan now={now} scheduleConfig={scheduleConfig} />}
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
          onClose={() => setShowChoreModal(false)}
        />
      )}
      {showUpcoming && (
        <UpcomingModal child={child} onClose={() => setShowUpcoming(false)} />
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

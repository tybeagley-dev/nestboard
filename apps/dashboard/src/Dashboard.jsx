import { useState, useEffect } from 'react'
import FloatingControls from './components/FloatingControls'
import GreetingSection from './components/GreetingSection'
import WeatherCard from './components/WeatherCard'
import MealPlan from './components/MealPlan'
import Calendar from './components/Calendar'
import CalendarModal from './components/CalendarModal'
import Routines from './components/Routines'
import ChoreModal from './components/ChoreModal'
import ScreenTimeModal from './components/ScreenTimeModal'
import TokensModal from './components/TokensModal'
import NotesAndGrocery from './components/NotesAndGrocery'
import UpcomingModal from './components/UpcomingModal'
import { useClock } from './hooks/useClock'
import { useWeather } from './hooks/useWeather'
import { useChildren } from './hooks/useChildren'
import { useScheduleConfig } from './hooks/useRoutines'
import { useLiveSync } from './hooks/useLiveSync'
import { useFamily, useSettings } from './FamilyContext'
import { unlockAudio } from './utils/chime'

export default function Dashboard() {
  const now     = useClock()
  const weather = useWeather()
  const family  = useFamily()
  const { modules } = useSettings()
  const { children } = useChildren()
  const { scheduleConfig } = useScheduleConfig()

  useLiveSync(family?.slug)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('clearcache')) {
      localStorage.clear()
      window.location.replace(window.location.pathname)
    }
  }, [])

  useEffect(() => {
    let hiddenAt = null
    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now()
      else if (hiddenAt !== null && Date.now() - hiddenAt >= 30 * 60 * 1000) location.reload()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  useEffect(() => {
    const unlock = () => unlockAudio()
    document.addEventListener('touchstart', unlock, { once: true })
    document.addEventListener('click',      unlock, { once: true })
    return () => {
      document.removeEventListener('touchstart', unlock)
      document.removeEventListener('click',      unlock)
    }
  }, [])

  const [showCalendar,      setShowCalendar]       = useState(false)
  const [showGrocery,       setShowGrocery]        = useState(false)
  const [activeChoreChild,  setActiveChoreChild]   = useState(null)
  const [activeScreenChild, setActiveScreenChild]  = useState(null)
  const [activeTokensChild,  setActiveTokensChild]   = useState(null)
  const [upcomingChild,     setUpcomingChild]      = useState(null)

  // Column count chosen to avoid a lonely last row (e.g. 4 → 2×2, not 3+1).
  const n = children.length
  const colCount = n <= 1 ? 1 : n <= 3 ? n : n === 4 ? 2 : n <= 6 ? 3 : 4

  return (
    <div className="dashboard">
      <FloatingControls />

      <div className="dashboard-top">
        <GreetingSection
          now={now}
          onGrocery={() => setShowGrocery(true)}
        />
        <div className="center-stack">
          <WeatherCard weather={weather} />
          {modules.meals && <MealPlan now={now} scheduleConfig={scheduleConfig} />}
        </div>
        <Calendar now={now} onExpand={() => setShowCalendar(true)} />
      </div>

      <div className={`dashboard-children${n === 1 ? ' solo' : ''}`} style={{ '--cols': colCount }}>
        <Routines
          now={now}
          children={children}
          scheduleConfig={scheduleConfig}
          onSpinChore={(child, chores, isExtra) => setActiveChoreChild({ child, chores, isExtra: !!isExtra })}
          onScreenTime={setActiveScreenChild}
          onTokens={setActiveTokensChild}
          onUpcoming={setUpcomingChild}
        />
      </div>

      {activeChoreChild && (
        <ChoreModal
          child={activeChoreChild.child}
          chores={activeChoreChild.chores}
          isExtra={activeChoreChild.isExtra}
          onClose={() => setActiveChoreChild(null)}
        />
      )}
      {activeScreenChild && (
        <ScreenTimeModal child={activeScreenChild} onClose={() => setActiveScreenChild(null)} />
      )}
      {activeTokensChild && (
        <TokensModal child={activeTokensChild} onClose={() => setActiveTokensChild(null)} />
      )}
      {upcomingChild && (
        <UpcomingModal child={upcomingChild} onClose={() => setUpcomingChild(null)} />
      )}
      {showCalendar && (
        <CalendarModal onClose={() => setShowCalendar(false)} />
      )}
      {showGrocery && (
        <div className="modal-backdrop" onClick={() => setShowGrocery(false)}>
          <div className="grocery-modal-card" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowGrocery(false)}>×</button>
            <NotesAndGrocery />
          </div>
        </div>
      )}
    </div>
  )
}

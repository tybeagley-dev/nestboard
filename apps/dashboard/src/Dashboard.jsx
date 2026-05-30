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
import BucksModal from './components/BucksModal'
import NotesAndGrocery from './components/NotesAndGrocery'
import UpcomingModal from './components/UpcomingModal'
import { useClock } from './hooks/useClock'
import { useWeather } from './hooks/useWeather'
import { useChildren } from './hooks/useChildren'
import { unlockAudio } from './utils/chime'

export default function Dashboard() {
  const now     = useClock()
  const weather = useWeather()
  const { children } = useChildren()

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
  const [activeBucksChild,  setActiveBucksChild]   = useState(null)
  const [upcomingChild,     setUpcomingChild]      = useState(null)

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
          <MealPlan now={now} />
        </div>
        <Calendar now={now} onExpand={() => setShowCalendar(true)} />
      </div>

      <div className="dashboard-children">
        <Routines
          now={now}
          children={children}
          onSpinChore={(child, chores, isExtra) => setActiveChoreChild({ child, chores, isExtra: !!isExtra })}
          onScreenTime={setActiveScreenChild}
          onBucks={setActiveBucksChild}
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
      {activeBucksChild && (
        <BucksModal child={activeBucksChild} onClose={() => setActiveBucksChild(null)} />
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

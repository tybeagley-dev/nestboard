import ChildCard from './ChildCard'
import { useRoutines } from '../hooks/useRoutines'
import { useChores } from '../hooks/useChores'
import { useActiveChildTimers } from '../hooks/useScreenTime'

export default function Routines({ now, children, scheduleConfig, onSpinChore, onScreenTime, onTokens, onUpcoming }) {
  const { routinesByChild, toggleRoutine, loading: routinesLoading } = useRoutines(now, children, scheduleConfig)
  const { chores, loading } = useChores()
  const activeTimers = useActiveChildTimers()

  return (
    <>
      {children.map(child => (
        <ChildCard
          key={child.name}
          child={child}
          now={now}
          routines={routinesByChild[child.name] ?? []}
          chores={chores}
          choresLoading={loading}
          onToggle={toggleRoutine}
          onSpin={() => onSpinChore(child, chores)}
          onExtraSpin={() => onSpinChore(child, chores, true)}
          onScreenTime={() => onScreenTime(child)}
          onTokens={() => onTokens(child)}
          onUpcoming={() => onUpcoming(child)}
          timer={activeTimers.find(t => t.child === child.name) ?? null}
          routinesLoading={routinesLoading}
          scheduleConfig={scheduleConfig}
        />
      ))}
    </>
  )
}

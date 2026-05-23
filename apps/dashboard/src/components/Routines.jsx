import ChildCard from './ChildCard'
import { useRoutines } from '../hooks/useRoutines'
import { useChores } from '../hooks/useChores'
import { useActiveChildTimers } from '../hooks/useScreenTime'

export default function Routines({ now, children, onSpinChore, onScreenTime, onBucks, onUpcoming }) {
  const { routinesByChild, toggleRoutine, loading: routinesLoading } = useRoutines(now, children)
  const { chores, loading } = useChores()
  const activeTimers = useActiveChildTimers()

  return (
    <>
      {children.map(child => (
        <ChildCard
          key={child.name}
          child={child}
          routines={routinesByChild[child.name] ?? []}
          chores={chores}
          choresLoading={loading}
          onToggle={toggleRoutine}
          onSpin={() => onSpinChore(child, chores)}
          onExtraSpin={() => onSpinChore(child, chores, true)}
          onScreenTime={() => onScreenTime(child)}
          onBucks={() => onBucks(child)}
          onUpcoming={() => onUpcoming(child)}
          timer={activeTimers.find(t => t.child === child.name) ?? null}
          routinesLoading={routinesLoading}
        />
      ))}
    </>
  )
}

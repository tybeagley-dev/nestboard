import { useState } from 'react'
import { apiPost } from './utils/api'
import { useFamily } from './FamilyContext'
import { useChildren } from './hooks/useChildren'
import StepChildren from './onboarding/StepChildren'
import StepLabels from './onboarding/StepLabels'
import StepCalendars from './onboarding/StepCalendars'
import StepWeather from './onboarding/StepWeather'
import StepDone from './onboarding/StepDone'
import ParentRoutinesTab from './components/ParentRoutinesTab'
import ParentZonesTab from './components/ParentZonesTab'
import ParentChoresTab from './components/ParentChoresTab'
import ParentMealsTab from './components/ParentMealsTab'

const STEPS = [
  { key: 'children', title: 'Add your kids',     optional: false, blurb: 'Who lives here? Add each child — everything else builds on this.' },
  { key: 'routines', title: 'Daily routines',    optional: true,  blurb: 'Morning and evening habits, per child.' },
  { key: 'zones',    title: 'Zones',             optional: true,  blurb: 'Build a "notice-and-do" habit with bite-sized weekly responsibilities.' },
  { key: 'chores',   title: 'Chores & tokens',   optional: true,  blurb: 'Set up the chore spinner, the token economy, and which days chores can be spun.' },
  { key: 'meals',     title: 'Meal plan',         optional: true,  blurb: 'Optional — a weekly dinner plan on the dashboard.' },
  { key: 'calendars', title: 'Connect calendars', optional: true,  blurb: 'Pull in Google Calendars so family events show on the dashboard.' },
  { key: 'weather',   title: 'Local weather',     optional: true,  blurb: 'Show your city’s forecast on the dashboard.' },
  { key: 'labels',    title: 'Name your rewards', optional: true,  blurb: 'Want custom names? Otherwise we’ll use "Tokens" and "Rewards Store."' },
  { key: 'done',      title: 'You’re all set',    optional: false, blurb: 'A few finishing touches, then you’re off.' },
]

export default function OnboardingWizard({ onComplete }) {
  const family = useFamily()
  const { children, reload: reloadChildren } = useChildren()
  const [i, setI] = useState(0)
  const [finishing, setFinishing] = useState(false)

  const step   = STEPS[i]
  const isLast = i === STEPS.length - 1
  // Required steps must be satisfied before advancing.
  const canAdvance = step.key !== 'children' || children.length > 0

  async function finish() {
    setFinishing(true)
    await apiPost('/auth/family/complete-onboarding', {})
    onComplete()
  }

  function next() { isLast ? finish() : setI(n => n + 1) }
  function back() { setI(n => Math.max(0, n - 1)) }

  function renderBody() {
    switch (step.key) {
      case 'children': return <StepChildren children={children} reload={reloadChildren} />
      case 'routines': return <ParentRoutinesTab children={children} />
      case 'zones':    return <ParentZonesTab children={children} />
      case 'chores':   return <ParentChoresTab children={children} />
      case 'meals':     return <ParentMealsTab />
      case 'calendars': return <StepCalendars children={children} />
      case 'weather':   return <StepWeather />
      case 'labels':    return <StepLabels />
      case 'done':      return <StepDone children={children} />
      default:
        return <p className="onboarding-placeholder">[{step.key}] step UI goes here</p>
    }
  }

  return (
    <div className="onboarding-wrap">
      <div className="onboarding-card">
        <div className="onboarding-progress">
          {STEPS.map((s, idx) => (
            <span key={s.key} className={`onboarding-dot ${idx === i ? 'active' : ''} ${idx < i ? 'done' : ''}`} />
          ))}
        </div>

        <p className="onboarding-step-count">Step {i + 1} of {STEPS.length}</p>
        <h1 className="onboarding-title">{step.title}</h1>
        <p className="onboarding-blurb">{step.blurb}</p>

        <div className="onboarding-body">
          {renderBody()}
        </div>

        <div className="onboarding-nav">
          <button className="onboarding-back" onClick={back} disabled={i === 0 || finishing}>Back</button>
          <div className="onboarding-nav-right">
            {step.optional && !isLast && (
              <button className="onboarding-skip" onClick={next} disabled={finishing}>Skip</button>
            )}
            <button className="onboarding-next" onClick={next} disabled={finishing || !canAdvance}>
              {isLast ? (finishing ? 'Finishing…' : 'Finish') : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

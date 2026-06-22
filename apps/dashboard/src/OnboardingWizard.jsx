import { useState } from 'react'
import { apiPost, apiPut } from './utils/api'
import { useFamily, resolveSettings } from './FamilyContext'
import { useChildren } from './hooks/useChildren'
import StepChildren from './onboarding/StepChildren'
import StepFeatures from './onboarding/StepFeatures'
import StepLabels from './onboarding/StepLabels'
import StepCalendars from './onboarding/StepCalendars'
import StepWeather from './onboarding/StepWeather'
import StepDone from './onboarding/StepDone'
import ParentRoutinesTab from './components/ParentRoutinesTab'
import ParentZonesTab from './components/ParentZonesTab'
import ParentChoresTab from './components/ParentChoresTab'
import ParentMealsTab from './components/ParentMealsTab'

// `module` tags a step that only shows when that feature flag is on.
const STEPS = [
  { key: 'children', title: 'Add your kids',     optional: false, blurb: 'Who lives here? Add each child, give them an icon and a color, or let them pick their own.' },
  { key: 'features', title: 'Which features?',   optional: true,  blurb: 'Pick the parts of nestboard your family wants. Anything you turn off disappears from the dashboard — and we’ll skip its setup here.' },
  { key: 'routines', title: 'Daily routines',    optional: true,  blurb: 'Routines that follow your family’s seasons — school days, weekends, summer, holidays — and switch on their own. Set morning and evening habits per child.' },
  { key: 'zones',    title: 'Zones',             optional: true,  module: 'zones', blurb: 'Bite-sized weekly responsibilities, one per kid. The goal: they start noticing small things that need doing and do them on their own, without being asked. We call these "notice-and-do’s."' },
  { key: 'chores',   title: 'Chores & tokens',   optional: true,  blurb: 'Set up the chore spinner, the token economy, and which days chores can be spun. Break a big chore into sub-tasks so nothing gets missed, and bump tougher ones to 2 tokens (default is 1).' },
  { key: 'meals',     title: 'Meal plan',         optional: true, module: 'meals', blurb: 'Show a weekly meal plan on the dashboard.' },
  { key: 'calendars', title: 'Connect calendars', optional: true,  blurb: 'Pull in your calendars so family events show on the dashboard.' },
  { key: 'weather',   title: 'Local weather',     optional: true,  blurb: 'Show your city’s forecast on the dashboard.' },
  { key: 'labels',    title: 'Name your rewards', optional: true, module: 'tokens', blurb: 'Want your own name for the token economy? We call ours "Beagley Bucks." Otherwise we’ll use "Token," "Tokens," and "Rewards Store."' },
  { key: 'done',      title: 'You’re all set',    optional: false, blurb: 'A few finishing touches, then you’re off.' },
]

export default function OnboardingWizard({ onComplete }) {
  const family = useFamily()
  const { children, reload: reloadChildren } = useChildren()
  const [i, setI] = useState(0)
  const [finishing, setFinishing] = useState(false)

  const initial = resolveSettings(family?.settings)
  const [modules, setModules]       = useState(initial.modules)
  const [screenTime, setScreenTime] = useState(initial.screenTime)

  // Persist feature choices as they change so the dashboard reflects them immediately.
  function saveSettings(partial) {
    const nextModules = { ...modules, ...(partial.modules ?? {}) }
    const nextST      = { ...screenTime, ...(partial.screenTime ?? {}) }
    setModules(nextModules)
    setScreenTime(nextST)
    apiPut('/auth/family/settings', { modules: nextModules, screenTime: nextST })
  }

  const visibleSteps = STEPS.filter(s => !s.module || modules[s.module])
  const idx    = Math.min(i, visibleSteps.length - 1)
  const step   = visibleSteps[idx]
  const isLast = idx === visibleSteps.length - 1
  // Required steps must be satisfied before advancing.
  const canAdvance = step.key !== 'children' || children.length > 0

  async function finish() {
    setFinishing(true)
    await apiPost('/auth/family/complete-onboarding', {})
    onComplete()
  }

  function next() { isLast ? finish() : setI(idx + 1) }
  function back() { setI(Math.max(0, idx - 1)) }

  function renderBody() {
    switch (step.key) {
      case 'children': return <StepChildren children={children} reload={reloadChildren} />
      case 'features': return <StepFeatures modules={modules} screenTime={screenTime} onChange={saveSettings} />
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
          {visibleSteps.map((s, di) => (
            <span key={s.key} className={`onboarding-dot ${di === idx ? 'active' : ''} ${di < idx ? 'done' : ''}`} />
          ))}
        </div>

        <p className="onboarding-step-count">Step {idx + 1} of {visibleSteps.length}</p>
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

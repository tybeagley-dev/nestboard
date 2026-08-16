import { useState } from 'react'
import { apiPost, apiPut } from './utils/api'
import { useFamily, resolveSettings } from './FamilyContext'
import { useChildren } from './hooks/useChildren'
import StepChildren from './onboarding/StepChildren'
import StepFeatures from './onboarding/StepFeatures'
import StepLabels from './onboarding/StepLabels'
import StepIdentity from './onboarding/StepIdentity'
import StepCalendars from './onboarding/StepCalendars'
import StepWeather from './onboarding/StepWeather'
import StepDone from './onboarding/StepDone'
import ParentRoutinesTab from './components/ParentRoutinesTab'
import ParentZonesTab from './components/ParentZonesTab'
import ParentChoresTab from './components/ParentChoresTab'
import ParentMealsTab from './components/ParentMealsTab'

// `module` tags a step that only shows when that feature flag is on.
const STEPS = [
  { key: 'children', title: 'Add your children',     optional: false, blurb: 'Who lives here? Add each child, give them an icon and a color, or let them pick their own.' },
  { key: 'features', title: 'Which features?',   optional: true,  blurb: 'Pick the parts of nestboard your family wants. Anything you turn off disappears from the dashboard — and we’ll skip its setup here.' },
  { key: 'routines', title: 'Daily routines',    optional: true,  blurb: 'The things that happen every day — brush hair, breakfast, pack lunch. Add each one once and choose which children it applies to.' },
  { key: 'zones',    title: 'Zones',             optional: true,  module: 'zones', blurb: 'Two levels: first add your zones — the areas of your home, like Kitchen or Bathroom — then add a few micro-zones inside each (small weekly jobs like “wipe the counter”). Each week every child is auto-assigned one micro-zone to notice and handle on their own. Start by adding a zone, then open it to add its micro-zones.' },
  { key: 'chores',   title: 'Chores & tokens',   optional: true,  blurb: 'Set up the chore spinner, the token economy, and which days chores can be spun. Break a big chore into sub-tasks so nothing gets missed, and give the tougher ones a higher value — everything starts at 1, and how high you go is up to you.' },
  { key: 'meals',     title: 'Meal plan',         optional: true, module: 'meals', blurb: 'Show a weekly meal plan on the dashboard.' },
  { key: 'calendars', title: 'Connect calendars', optional: true,  blurb: 'Pull in your calendars so family events show on the dashboard.' },
  { key: 'weather',   title: 'Local weather',     optional: true,  blurb: 'Show your city’s forecast on the dashboard.' },
  { key: 'labels',    title: 'Name your rewards', optional: true, module: 'tokens', blurb: 'Want your own name for the token economy? Plenty of families use their surname — "Smith Bucks" — or something sillier. Otherwise we’ll use "Token," "Tokens," and "Rewards Store."' },
  { key: 'identity',  title: 'Name your board',   optional: true, blurb: 'Your dashboard opens with a greeting built from your family name. Change the second line if it reads better another way — "the Smiths", "Team Smith", whatever your family actually calls itself.' },
  { key: 'done',      title: 'You’re all set',    optional: false, blurb: 'A few finishing touches, then you’re off.' },
]

export default function OnboardingWizard({ onComplete }) {
  const family = useFamily()
  const { children, reload: reloadChildren } = useChildren()
  const [finishing, setFinishing] = useState(false)

  const initial = resolveSettings(family?.settings)
  const [modules, setModules]       = useState(initial.modules)
  const [screenTime, setScreenTime] = useState(initial.screenTime)
  const [choreCfg,   setChoreCfg]   = useState(initial.chores)

  // Resume where they left off. The stored value is a step key rather than an
  // index because the visible-step list depends on the feature flags.
  const [i, setI] = useState(() => {
    const visible = STEPS.filter(s => !s.module || initial.modules[s.module])
    return Math.max(0, visible.findIndex(s => s.key === initial.onboarding.stepKey))
  })
  // Steps the family passed on. Survives a reload so the dashboard reminder and
  // a resumed wizard agree about what's left.
  const [deferred, setDeferred] = useState(initial.onboarding.outstanding ?? [])

  // Persist feature choices as they change so the dashboard reflects them immediately.
  function saveSettings(partial) {
    const nextModules = { ...modules, ...(partial.modules ?? {}) }
    const nextST      = { ...screenTime, ...(partial.screenTime ?? {}) }
    const nextChores  = { ...choreCfg,   ...(partial.chores ?? {}) }
    setModules(nextModules)
    setScreenTime(nextST)
    setChoreCfg(nextChores)
    apiPut('/auth/family/settings', { modules: nextModules, screenTime: nextST, chores: nextChores })
  }

  const visibleSteps = STEPS.filter(s => !s.module || modules[s.module])
  const idx    = Math.min(i, visibleSteps.length - 1)
  const step   = visibleSteps[idx]
  const isLast = idx === visibleSteps.length - 1
  // Required steps must be satisfied before advancing.
  const canAdvance = step.key !== 'children' || children.length > 0

  // `completed` records whether they walked the whole wizard; complete-onboarding
  // only unlocks the dashboard. Keeping them apart is what lets the admin view
  // still see who bailed and where.
  async function finish(outstanding = deferred, completed = true) {
    setFinishing(true)
    await apiPut('/auth/family/settings', { onboarding: { completed, outstanding, stepKey: '' } })
    await apiPost('/auth/family/complete-onboarding', {})
    onComplete()
  }

  // Leave now, keep the rest as a to-do. Everything from here on is outstanding —
  // including the current step, since we can't tell a half-finished step from an
  // untouched one. A false positive just means the reminder lists one extra.
  function finishLater() {
    const remaining = visibleSteps.slice(idx).map(s => s.key).filter(k => k !== 'done')
    finish([...new Set([...deferred, ...remaining])], false)
  }

  function advance(defer) {
    const nextDeferred = defer
      ? [...new Set([...deferred, step.key])]
      : deferred.filter(k => k !== step.key)
    const nextIdx = idx + 1
    setDeferred(nextDeferred)
    setI(nextIdx)
    apiPut('/auth/family/settings', {
      onboarding: { outstanding: nextDeferred, stepKey: visibleSteps[nextIdx]?.key ?? '' },
    })
  }

  function next() { isLast ? finish() : advance(false) }
  function skip() { advance(true) }

  function back() {
    const prevIdx = Math.max(0, idx - 1)
    setI(prevIdx)
    apiPut('/auth/family/settings', { onboarding: { stepKey: visibleSteps[prevIdx].key } })
  }

  function renderBody() {
    switch (step.key) {
      case 'children': return <StepChildren children={children} reload={reloadChildren} />
      case 'features': return <StepFeatures modules={modules} screenTime={screenTime} chores={choreCfg} onChange={saveSettings} />
      case 'routines': return <ParentRoutinesTab children={children} />
      case 'zones':    return <ParentZonesTab children={children} />
      case 'chores':   return <ParentChoresTab children={children} />
      case 'meals':     return <ParentMealsTab />
      case 'calendars': return <StepCalendars children={children} />
      case 'weather':   return <StepWeather />
      case 'labels':    return <StepLabels />
      case 'identity':  return <StepIdentity />
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
          <button className="onboarding-back" onClick={back} disabled={idx === 0 || finishing}>Back</button>
          <div className="onboarding-nav-right">
            {step.optional && !isLast && (
              <button className="onboarding-skip" onClick={skip} disabled={finishing}>
                Skip for now
              </button>
            )}
            <button className="onboarding-next" onClick={next} disabled={finishing || !canAdvance}>
              {isLast ? (finishing ? 'Finishing…' : 'Finish') : 'Next'}
            </button>
          </div>
        </div>

        {/* Not offered on the children step: it's the one hard gate, and bailing
            with no children lands them on an empty dashboard. Kept to a single
            line — the shell is overflow:hidden, so anything taller than the
            viewport is unreachable rather than scrollable. */}
        {!isLast && step.key !== 'children' && (
          <button
            className="onboarding-bail-btn"
            onClick={finishLater}
            disabled={finishing}
            title="Takes you to your dashboard now. Anything you haven't set up waits for you in the Parent Panel — nothing you've already entered is lost."
          >
            {finishing ? 'Saving…' : 'Save and finish setup later'}
          </button>
        )}
      </div>
    </div>
  )
}

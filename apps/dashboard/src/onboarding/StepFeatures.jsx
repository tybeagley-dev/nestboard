// Dedicated feature picker. Turning a module off here hides its dashboard
// surfaces AND skips its later onboarding step (the wizard gates on this state).
// Screen-time tuning (daily allotment, token cost) shows only when screen time
// is on. Controlled by OnboardingWizard, which persists via PUT /auth/family/settings.
const MODULE_ROWS = [
  { key: 'screenTime', title: 'Screen time',     desc: 'Earn and spend screen-time minutes, with timers.' },
  { key: 'tokens',     title: 'Tokens & rewards', desc: 'A token economy with a rewards store kids spend in.' },
  { key: 'zones',      title: 'Zones',            desc: 'Weekly notice-and-do responsibilities, one per kid.' },
  { key: 'meals',      title: 'Meals & grocery',  desc: 'Weekly meal plan and a shared grocery list.' },
]

function Toggle({ on, onChange }) {
  return (
    <div className="chore-form-toggle feature-toggle">
      <button className={on ? 'active' : ''} onClick={() => onChange(true)}>On</button>
      <button className={!on ? 'active' : ''} onClick={() => onChange(false)}>Off</button>
    </div>
  )
}

export default function StepFeatures({ modules, screenTime, onChange }) {
  // Meals & grocery are one choice here but two flags under the hood.
  function setModule(key, val) {
    if (key === 'meals') onChange({ modules: { meals: val, grocery: val } })
    else onChange({ modules: { [key]: val } })
  }
  const setST = patch => onChange({ screenTime: patch })

  return (
    <div className="onboarding-features">
      <p className="onboarding-help">
        Turn on only what your family wants — you can change any of this later in Settings.
      </p>

      {MODULE_ROWS.map(row => (
        <div key={row.key} className="feature-row">
          <div className="feature-row-text">
            <span className="feature-row-title">{row.title}</span>
            <span className="feature-row-desc">{row.desc}</span>
          </div>
          <Toggle on={modules[row.key]} onChange={v => setModule(row.key, v)} />
        </div>
      ))}

      {modules.screenTime && (
        <div className="feature-subsettings">
          <label className="feature-num-row">
            <span>Free screen-time minutes per day <em>(0 = none; doesn’t carry over)</em></span>
            <input
              type="number" min="0" step="5"
              value={screenTime.dailyAllotmentMinutes}
              onChange={e => setST({ dailyAllotmentMinutes: Math.max(0, parseInt(e.target.value || '0', 10)) })}
            />
          </label>
          {modules.tokens && (
            <label className="feature-num-row">
              <span>Tokens to buy 10 minutes</span>
              <input
                type="number" min="1" step="1"
                value={screenTime.tokensPerBlock}
                onChange={e => setST({ tokensPerBlock: Math.max(1, parseInt(e.target.value || '1', 10)) })}
              />
            </label>
          )}
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useMeals } from '../hooks/useMeals'
import TabGuide from './TabGuide'

const DAY_SHORT = { Sunday: 'Sun', Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat' }

export default function ParentMealsTab() {
  const { meals, updateMeal, DAY_ORDER, loaded } = useMeals()

  const [draft, setDraft] = useState(() =>
    DAY_ORDER.map(day => ({ day, main: '', note: '', lunch: '' }))
  )
  const [saved,    setSaved]    = useState(false)

  useEffect(() => {
    if (!loaded) return
    setDraft(DAY_ORDER.map(day => {
      const m = meals.find(m => m.day === day) ?? { day, main: '', note: '', lunch: '' }
      return { day, main: m.main ?? '', note: m.note ?? '', lunch: m.lunch ?? '' }
    }))
  }, [loaded]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange(day, field, value) {
    setDraft(prev => prev.map(m => m.day === day ? { ...m, [field]: value } : m))
    setSaved(false)
  }

  function handleSaveMeals() {
    draft.forEach(({ day, main, note, lunch }) => updateMeal(day, main, note, lunch))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="parent-meals-tab">

      <TabGuide summary="How the meal plan works">
        <p className="onboarding-guide-text">
          Set each day’s dinner — plus a lunch line for summer days — and it shows on the dashboard
          so everyone knows what’s for dinner.
        </p>
      </TabGuide>

      {/* ── Meal Plan ── */}
      <p className="parent-section-label" style={{ marginBottom: 8 }}>MEAL PLAN</p>
      <div className="meals-edit-list">
        {draft.map(({ day, main, note, lunch }) => (
          <div key={day} className="meals-edit-row">
            <span className="meals-edit-day">{DAY_SHORT[day]}</span>
            <div className="meals-edit-fields">
              <input
                className="meals-edit-input meals-edit-main"
                placeholder="Dinner"
                value={main}
                onChange={e => handleChange(day, 'main', e.target.value)}
              />
              <input
                className="meals-edit-input meals-edit-note"
                placeholder="Lunch (summer)"
                value={lunch}
                onChange={e => handleChange(day, 'lunch', e.target.value)}
              />
              <input
                className="meals-edit-input meals-edit-note"
                placeholder="Note (optional)"
                value={note}
                onChange={e => handleChange(day, 'note', e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
      <button
        className={`parent-save-meals-btn ${saved ? 'saved' : ''}`}
        onClick={handleSaveMeals}
      >
        {saved ? '✓ Saved' : 'Save Meal Plan'}
      </button>

    </div>
  )
}

import { useState, useEffect } from 'react'
import { useMeals } from '../hooks/useMeals'
import { useAnnouncements } from '../hooks/useAnnouncements'
import TabGuide from './TabGuide'

const DAY_SHORT = { Sunday: 'Sun', Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat' }

export default function ParentMealsTab() {
  const { meals, updateMeal, DAY_ORDER, loaded } = useMeals()
  const { announcements, addAnnouncement, removeAnnouncement } = useAnnouncements()

  const [draft, setDraft] = useState(() =>
    DAY_ORDER.map(day => ({ day, main: '', note: '', lunch: '' }))
  )
  const [saved,    setSaved]    = useState(false)
  const [newNote,  setNewNote]  = useState('')
  const [adding,   setAdding]   = useState(false)

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

  async function handleAddNote() {
    const text = newNote.trim()
    if (!text) return
    setAdding(true)
    await addAnnouncement(text)
    setNewNote('')
    setAdding(false)
  }

  return (
    <div className="parent-meals-tab">

      <TabGuide summary="How the meal plan works">
        <p className="onboarding-guide-text">
          Set each day’s dinner — plus a lunch line for summer days — and it shows on the dashboard
          so everyone knows what’s for dinner. Family notes you add below appear on the dashboard too.
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

      {/* ── Family Notes / Announcements ── */}
      <p className="parent-section-label" style={{ marginTop: 20, marginBottom: 8 }}>FAMILY NOTES</p>

      <div className="parent-notes-list">
        {announcements.length === 0 && (
          <p className="parent-soon-msg" style={{ padding: '8px 0', textAlign: 'left' }}>No notes yet.</p>
        )}
        {announcements.map(a => (
          <div key={a.id} className="parent-note-row">
            <span className="parent-note-text">{a.text}</span>
            <button className="chore-admin-del-btn" onClick={() => removeAnnouncement(a.id)}>×</button>
          </div>
        ))}
      </div>

      <div className="parent-note-add-row">
        <input
          className="chore-form-input"
          placeholder="Add a family note…"
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddNote()}
        />
        <button
          className="parent-apply-btn"
          onClick={handleAddNote}
          disabled={adding || !newNote.trim()}
          style={{ flexShrink: 0 }}
        >
          Add
        </button>
      </div>
    </div>
  )
}

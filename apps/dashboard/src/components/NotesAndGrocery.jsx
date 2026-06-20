import { useState, useRef } from 'react'
import { useGroceryList } from '../hooks/useGroceryList'

export default function NotesAndGrocery() {
  const { items, addItem, removeItem, clearAll } = useGroceryList()
  const [draft, setDraft]               = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const inputRef = useRef(null)

  function handleAdd() {
    if (!draft.trim()) return
    addItem(draft)
    setDraft('')
    inputRef.current?.focus()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleAdd()
  }

  function handleClear() {
    if (confirmClear) {
      clearAll()
      setConfirmClear(false)
    } else {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 3000)
    }
  }

  return (
    <section className="grocery-panel">
      <h2 className="grocery-modal-title">Grocery List</h2>
      <div className="grocery-input-row">
        <input
          ref={inputRef}
          className="grocery-input"
          type="text"
          placeholder="Add an item…"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="grocery-add-btn" onClick={handleAdd}>Add</button>
      </div>

      <ul className="grocery-list">
        {items.map(entry => (
          <li key={entry.id} className="grocery-item">
            <span className="grocery-item-text">{entry.item}</span>
            <button
              className="grocery-remove"
              onClick={() => removeItem(entry.id)}
              aria-label={`Remove ${entry.item}`}
            >×</button>
          </li>
        ))}
        {items.length === 0 && (
          <p className="ng-empty">Nothing on the list yet</p>
        )}
      </ul>

      {items.length > 0 && (
        <div className="grocery-actions">
          <button
            className={`grocery-clear-btn ${confirmClear ? 'confirm' : ''}`}
            onClick={handleClear}
          >
            {confirmClear ? 'Tap again to clear' : 'Clear All'}
          </button>
        </div>
      )}
    </section>
  )
}

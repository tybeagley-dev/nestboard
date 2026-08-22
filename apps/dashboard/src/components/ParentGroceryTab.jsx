import { useState } from 'react'
import { useGroceryList, UNASSIGNED } from '../hooks/useGroceryList'
import TabGuide from './TabGuide'

const NEW_STORE = '__new__'

function listText(label, items) {
  if (items.length === 0) return `${label} list is empty!`
  return `${label} 🛒\n\n${items.map(i => `• ${i.item}`).join('\n')}`
}

// No `title`: iOS Messages renders the share sheet's title AND the body, so
// passing both printed the heading twice ("Grocery List / Grocery List 🛒").
// The heading lives in the text, which is what actually gets sent.
async function share(text) {
  if (navigator.share) {
    try { await navigator.share({ text }) } catch {}
  } else {
    await navigator.clipboard.writeText(text)
  }
}

export default function ParentGroceryTab() {
  const { items, groups, stores, addItem, addStore, setItemStore, removeItem } = useGroceryList()
  // Item id currently typing a brand-new store name, for the per-item shortcut.
  const [namingFor, setNamingFor] = useState(null)
  const [newStore, setNewStore]   = useState('')
  const [storeDraft, setStoreDraft] = useState('')
  const [itemDraft, setItemDraft]     = useState('')
  const [itemStore, setItemStore_]    = useState('')

  function handleSelect(id, value) {
    if (value === NEW_STORE) {
      setNamingFor(id)
      setNewStore('')
      return
    }
    setItemStore(id, value)
  }

  function commitNewStore(id) {
    const name = newStore.trim()
    if (name) setItemStore(id, name)
    setNamingFor(null)
    setNewStore('')
  }

  function handleAddItem() {
    if (!itemDraft.trim()) return
    addItem(itemDraft, itemStore)
    setItemDraft('')
    // The store stays selected — filing a run of Costco items one after another
    // is the common case, and re-picking it each time is the tedious part.
  }

  function handleAddStore() {
    if (!storeDraft.trim()) return
    addStore(storeDraft)
    setStoreDraft('')
  }

  function handleShareAll() {
    // One group: name it after its store. The store is the most useful thing in
    // the message — dropping it for a generic "Grocery List" heading loses the
    // only detail identifying the trip, and a family with one store would never
    // see a store name at all. Unassigned-only keeps the generic heading, since
    // there's no store to name.
    if (groups.length <= 1) {
      const only = groups[0]
      return share(listText(only?.store ?? 'Grocery List', only?.items ?? []))
    }
    // Several stores: keep the per-store headings — a flat list of twenty items
    // is exactly what the store split was meant to fix.
    share(`Grocery List 🛒\n\n${groups
      .map(g => `${g.store ?? 'Unassigned'}\n${g.items.map(i => `• ${i.item}`).join('\n')}`)
      .join('\n\n')}`)
  }

  return (
    <div className="parent-chores-tab">
      <TabGuide summary="How the grocery list works">
        <p className="onboarding-guide-text">
          The family’s shared grocery list — anyone can add items from the board or their own page,
          and everything lands under <strong>Unassigned</strong>. Sorting items into stores happens
          here: add your stores below, then pick one for each item. Use a store’s own
          <strong> Send</strong> button to text yourself just that trip.
        </p>
      </TabGuide>

      <div className="grocery-stores-bar">
        <h3 className="grocery-group-title">Your stores</h3>
        {stores.length > 0 && (
          <div className="grocery-store-chips">
            {stores.map(s => <span key={s} className="grocery-store-chip">{s}</span>)}
          </div>
        )}
        <div className="grocery-input-row">
          <input
            className="grocery-input"
            type="text"
            maxLength={40}
            placeholder="Add a store…"
            value={storeDraft}
            onChange={e => setStoreDraft(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddStore()}
          />
          <button className="grocery-add-btn" onClick={handleAddStore}>Add</button>
        </div>
      </div>

      <div className="grocery-add-item">
        <h3 className="grocery-group-title">Add an item</h3>
        <div className="grocery-input-row">
          <input
            className="grocery-input"
            type="text"
            maxLength={120}
            placeholder="Add an item…"
            value={itemDraft}
            onChange={e => setItemDraft(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddItem()}
          />
          {stores.length > 0 && (
            <select
              className="grocery-store-select"
              value={itemStore}
              onChange={e => setItemStore_(e.target.value)}
              aria-label="Store for the new item"
            >
              <option value="">Unassigned</option>
              {stores.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <button className="grocery-add-btn" onClick={handleAddItem}>Add</button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="parent-soon-msg">Nothing on the grocery list yet.</p>
      ) : (
        <div className="grocery-groups">
          {groups.map(group => (
            <div className="grocery-group" key={group.store ?? UNASSIGNED}>
              <div className="grocery-group-header">
                <h3 className="grocery-group-title">{group.store ?? 'Unassigned'}</h3>
                <button
                  className="admin-btn admin-btn-sm"
                  onClick={() => share(listText(group.store ?? 'Grocery List', group.items))}
                >
                  Send
                </button>
              </div>
              <ul className="grocery-list">
                {group.items.map(entry => (
                  <li key={entry.id} className="grocery-item">
                    <span className="grocery-item-text">{entry.item}</span>
                    {namingFor === entry.id ? (
                      <input
                        className="grocery-store-new"
                        autoFocus
                        maxLength={40}
                        placeholder="Store name"
                        value={newStore}
                        onChange={e => setNewStore(e.target.value)}
                        onBlur={() => commitNewStore(entry.id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitNewStore(entry.id)
                          if (e.key === 'Escape') { setNamingFor(null); setNewStore('') }
                        }}
                      />
                    ) : (
                      <select
                        className="grocery-store-select"
                        value={entry.store ?? ''}
                        onChange={e => handleSelect(entry.id, e.target.value)}
                        aria-label={`Store for ${entry.item}`}
                      >
                        <option value="">Unassigned</option>
                        {stores.map(s => <option key={s} value={s}>{s}</option>)}
                        <option value={NEW_STORE}>+ New store…</option>
                      </select>
                    )}
                    <button
                      className="grocery-remove"
                      onClick={() => removeItem(entry.id)}
                      aria-label={`Remove ${entry.item}`}
                    >×</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <button className="grocery-share-btn" style={{ marginTop: 16 }} onClick={handleShareAll}>
          📱 Send whole list as Text
        </button>
      )}
    </div>
  )
}

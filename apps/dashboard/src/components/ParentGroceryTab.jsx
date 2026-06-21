import { useGroceryList } from '../hooks/useGroceryList'
import TabGuide from './TabGuide'

export default function ParentGroceryTab() {
  const { items } = useGroceryList()

  async function handleShare() {
    const text = items.length === 0
      ? 'Grocery list is empty!'
      : `Grocery List 🛒\n\n${items.map(i => `• ${i.item}`).join('\n')}`
    if (navigator.share) {
      try { await navigator.share({ title: 'Grocery List', text }) } catch {}
    } else {
      await navigator.clipboard.writeText(text)
    }
  }

  return (
    <div className="parent-chores-tab">
      <TabGuide summary="How the grocery list works">
        <p className="onboarding-guide-text">
          The family’s shared grocery list — anyone can add items from the dashboard as you run low.
          Tap <strong>Send as Text</strong> to ship the whole list to your phone before a store run.
        </p>
      </TabGuide>

      {items.length === 0 ? (
        <p className="parent-soon-msg">Nothing on the grocery list yet.</p>
      ) : (
        <ul className="grocery-list">
          {items.map(entry => (
            <li key={entry.id} className="grocery-item">
              <span className="grocery-item-text">{entry.item}</span>
            </li>
          ))}
        </ul>
      )}

      <button className="grocery-share-btn" style={{ marginTop: 16 }} onClick={handleShare}>
        📱 Send as Text
      </button>
    </div>
  )
}

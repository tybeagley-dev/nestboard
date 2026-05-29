import { useState, useEffect } from 'react'
import PinModal from './PinModal'
import ParentBucksTab from './ParentBucksTab'
import ParentChoresTab from './ParentChoresTab'
import ParentMealsTab    from './ParentMealsTab'
import ParentRoutinesTab from './ParentRoutinesTab'
import ParentZonesTab from './ParentZonesTab'
import ParentMomStoreTab from './ParentMomStoreTab'
import ParentApprovalsTab from './ParentApprovalsTab'
import ParentGroceryTab from './ParentGroceryTab'
import ParentChildrenTab from './ParentChildrenTab'

async function fetchPendingCount() {
  try {
    const { apiGet } = await import('../utils/api')
    const [chores, stCount] = await Promise.all([
      apiGet('/chores/pending-approvals'),
      apiGet('/screen-time/pending-count'),
    ])
    return (Array.isArray(chores) ? chores.length : 0) + (stCount?.count ?? 0)
  } catch { return 0 }
}

export default function ParentPanel({ onClose, children, reloadChildren }) {
  const [unlocked,      setUnlocked]      = useState(false)
  const [tab,           setTab]           = useState('approvals')
  const [pendingCount,  setPendingCount]  = useState(0)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Poll pending count so the badge stays current while portal is open
  useEffect(() => {
    if (!unlocked) return
    fetchPendingCount().then(setPendingCount)
    const id = setInterval(() => fetchPendingCount().then(setPendingCount), 15000)
    return () => clearInterval(id)
  }, [unlocked])

  if (!unlocked) {
    return (
      <PinModal
        prompt="Parent Panel"
        onSuccess={() => setUnlocked(true)}
        onCancel={onClose}
      />
    )
  }

  const TABS = [
    { id: 'approvals', label: 'Approvals', badge: pendingCount },
    { id: 'bucks',     label: 'Bucks & Time' },
    { id: 'chores',    label: 'Chores'       },
    { id: 'routines',  label: 'Routines'     },
    { id: 'zones',     label: 'Zones'        },
    { id: 'meals',     label: 'Meals'        },
    { id: 'store',     label: 'Mom Store'    },
    { id: 'grocery',   label: 'Grocery'      },
    { id: 'children',  label: 'Children'     },
  ]

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="parent-panel">
        <div className="parent-panel-hd">
          <h2 className="parent-panel-title">Parent Panel</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="parent-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`parent-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.badge > 0 && <span className="tab-badge">{t.badge}</span>}
            </button>
          ))}
        </div>

        <div className="parent-panel-body">
          {tab === 'approvals' && <ParentApprovalsTab children={children} />}
          {tab === 'bucks'     && <ParentBucksTab children={children} />}
          {tab === 'chores'    && <ParentChoresTab children={children} />}
          {tab === 'routines'  && <ParentRoutinesTab children={children} />}
          {tab === 'zones'     && <ParentZonesTab children={children} />}
          {tab === 'meals'     && <ParentMealsTab />}
          {tab === 'store'     && <ParentMomStoreTab children={children} />}
          {tab === 'grocery'   && <ParentGroceryTab />}
          {tab === 'children'  && <ParentChildrenTab children={children} onReload={reloadChildren} />}
        </div>
      </div>
    </div>
  )
}

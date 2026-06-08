import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Menu, X } from 'lucide-react'
import PinModal from './components/PinModal'
import ParentBucksTab from './components/ParentBucksTab'
import ParentChoresTab from './components/ParentChoresTab'
import ParentMealsTab from './components/ParentMealsTab'
import ParentRoutinesTab from './components/ParentRoutinesTab'
import ParentZonesTab from './components/ParentZonesTab'
import ParentMomStoreTab from './components/ParentMomStoreTab'
import ParentApprovalsTab from './components/ParentApprovalsTab'
import ParentGroceryTab from './components/ParentGroceryTab'
import ParentChildrenTab from './components/ParentChildrenTab'
import ParentCalendarTab from './components/ParentCalendarTab'
import ParentNotificationsTab from './components/ParentNotificationsTab'
import ParentFamilyTab from './components/ParentFamilyTab'
import { useChildren } from './hooks/useChildren'

const SESSION_KEY = 'parent_unlocked_at'
const TIMEOUT_MS  = 3 * 60 * 1000

function isUnlocked() {
  const ts = sessionStorage.getItem(SESSION_KEY)
  return ts && Date.now() - Number(ts) < TIMEOUT_MS
}

async function fetchPendingCount() {
  try {
    const { apiGet } = await import('./utils/api')
    const [chores, stCount] = await Promise.all([
      apiGet('/chores/pending-approvals'),
      apiGet('/screen-time/pending-count'),
    ])
    return (Array.isArray(chores) ? chores.length : 0) + (stCount?.count ?? 0)
  } catch { return 0 }
}

export default function ParentPage() {
  const navigate = useNavigate()
  const { children, reload: reloadChildren } = useChildren()
  const [unlocked, setUnlocked] = useState(isUnlocked)
  const [tab, setTab] = useState('approvals')
  const [pendingCount, setPendingCount] = useState(0)
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') navigate('/') }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  useEffect(() => {
    if (!unlocked) return
    fetchPendingCount().then(setPendingCount)
    const id = setInterval(() => fetchPendingCount().then(setPendingCount), 15000)
    return () => clearInterval(id)
  }, [unlocked])

  function handleUnlock() {
    sessionStorage.setItem(SESSION_KEY, String(Date.now()))
    setUnlocked(true)
  }

  if (!unlocked) {
    return (
      <div className="parent-pin-page">
        <PinModal
          prompt="Parent Panel"
          onSuccess={handleUnlock}
          onCancel={() => navigate('/')}
        />
      </div>
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
    { id: 'calendars',     label: 'Calendars'      },
    { id: 'notifications', label: 'Notifications'  },
    { id: 'family',        label: 'Family'         },
  ]

  return (
    <div className="parent-page">
      <aside className={`parent-sidebar ${navOpen ? 'parent-sidebar--open' : ''}`}>
        <button className="parent-back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={15} strokeWidth={2} />
          Dashboard
        </button>
        <p className="parent-sidebar-label">Parent Panel</p>
        <nav className="parent-nav">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`parent-nav-item ${tab === t.id ? 'active' : ''}`}
              onClick={() => { setTab(t.id); setNavOpen(false) }}
            >
              {t.label}
              {t.badge > 0 && <span className="tab-badge">{t.badge}</span>}
            </button>
          ))}
        </nav>
      </aside>

      {navOpen && <div className="parent-nav-backdrop" onClick={() => setNavOpen(false)} />}

      <main className="parent-content">
        <h2 className="parent-content-title">
          <button className="parent-nav-toggle" onClick={() => setNavOpen(o => !o)}>
            {navOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          {TABS.find(t => t.id === tab)?.label}
        </h2>
        <div className="parent-content-body">
          {tab === 'approvals' && <ParentApprovalsTab children={children} />}
          {tab === 'bucks'     && <ParentBucksTab children={children} />}
          {tab === 'chores'    && <ParentChoresTab children={children} />}
          {tab === 'routines'  && <ParentRoutinesTab children={children} />}
          {tab === 'zones'     && <ParentZonesTab children={children} />}
          {tab === 'meals'     && <ParentMealsTab />}
          {tab === 'store'     && <ParentMomStoreTab children={children} />}
          {tab === 'grocery'   && <ParentGroceryTab />}
          {tab === 'children'  && <ParentChildrenTab children={children} onReload={reloadChildren} />}
          {tab === 'calendars'     && <ParentCalendarTab children={children} />}
          {tab === 'notifications' && <ParentNotificationsTab children={children} />}
          {tab === 'family'        && <ParentFamilyTab />}
        </div>
      </main>
    </div>
  )
}

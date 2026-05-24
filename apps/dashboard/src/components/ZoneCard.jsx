import { useZone, isPeriodUnlocked, PERIODS } from '../hooks/useZone'

const PERIOD_ICONS = { morning: '☀️', noon: '🌤️', evening: '🌙' }

function PeriodCheck({ period, checked, unlocked, onToggle }) {
  return (
    <button
      className={`zone-period-btn ${checked ? 'checked' : ''} ${!unlocked ? 'locked' : ''}`}
      onClick={unlocked ? onToggle : undefined}
      aria-pressed={checked}
      aria-label={`${period} check-in${!unlocked ? ' (not yet)' : ''}`}
      disabled={!unlocked}
    >
      <span className="zone-period-check">
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="zone-period-label">{PERIOD_ICONS[period]}</span>
    </button>
  )
}

function AssignmentRow({ assignment, now, isChecked, onToggle }) {
  return (
    <div className="zone-assignment-row">
      <span className="zone-assignment-icon">{assignment.zone_icon}</span>
      <div className="zone-assignment-info">
        <span className="zone-assignment-micro">{assignment.micro_zone_label}</span>
        <span className="zone-assignment-zone">{assignment.zone_label}</span>
      </div>
      <div className="zone-period-checks">
        {PERIODS.map(period => (
          <PeriodCheck
            key={period}
            period={period}
            checked={isChecked(assignment.id, period)}
            unlocked={isPeriodUnlocked(period, now)}
            onToggle={() => onToggle(assignment.id, period)}
          />
        ))}
      </div>
    </div>
  )
}

export default function ZoneCard({ child, now }) {
  const { assignments, loading, toggleCheck, isChecked } = useZone(child, now)

  if (loading || assignments.length === 0) return null

  return (
    <div className="zone-card">
      <div className="zone-card-header">
        <span className="zone-card-title">Zone{assignments.length > 1 ? 's' : ''} this week</span>
      </div>
      {assignments.map(a => (
        <AssignmentRow
          key={a.id}
          assignment={a}
          now={now}
          isChecked={isChecked}
          onToggle={toggleCheck}
        />
      ))}
    </div>
  )
}

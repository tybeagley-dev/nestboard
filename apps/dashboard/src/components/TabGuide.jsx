// Collapsed-by-default coaching for a parent tab — same shape and CSS as
// CalendarGuide, surfaced post-onboarding for the features people forget a week
// in (the "notice-and-do" concept, the chore/token mechanics). Reuses the
// .calendar-guide / .onboarding-guide-* styles.
export default function TabGuide({ summary, children }) {
  return (
    <details className="calendar-guide tab-guide">
      <summary className="calendar-guide-summary">{summary}</summary>
      <div className="calendar-guide-body">{children}</div>
    </details>
  )
}

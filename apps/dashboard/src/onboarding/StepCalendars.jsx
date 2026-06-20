import ParentCalendarTab from '../components/ParentCalendarTab'

// The calendar coaching now lives in CalendarGuide (rendered inside
// ParentCalendarTab); onboarding just shows it expanded.
export default function StepCalendars({ children }) {
  return (
    <div className="onboarding-calendars">
      <ParentCalendarTab children={children} guideOpen />
    </div>
  )
}

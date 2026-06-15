import ParentCalendarTab from '../components/ParentCalendarTab'

// Coaching for the buried Google Calendar "Secret address in iCal format".
// Steps with a `figure` slot get a labeled placeholder — drop a screenshot at the
// given /onboarding path to replace it.
const GUIDE = [
  { text: 'On a computer, open Google Calendar (calendar.google.com) — it’s the same Google account as your Gmail.' },
  { text: 'In the left sidebar, hover the calendar you want, click its ⋮ menu, and choose “Settings and sharing.”', figure: 'calendar-settings' },
  { text: 'Scroll down to the “Integrate calendar” section.', figure: 'calendar-integrate' },
  { text: 'Copy the “Secret address in iCal format” — the long link ending in .ics. (Secret = keep it private; anyone with it can see your events.)', figure: 'calendar-ical' },
  { text: 'Add a calendar below and paste that link into the iCal URL field.' },
]

export default function StepCalendars({ children }) {
  return (
    <div className="onboarding-calendars">
      <div className="onboarding-guide">
        <p className="onboarding-guide-title">Where to find your Google Calendar link</p>
        <p className="onboarding-help">It’s tucked away in Google Calendar’s settings — here’s the path:</p>
        <ol className="onboarding-guide-steps">
          {GUIDE.map((g, i) => (
            <li key={i}>
              <span className="onboarding-guide-text">{g.text}</span>
              {g.figure && (
                <div className="onboarding-guide-figure" data-slot={g.figure}>
                  screenshot: {g.figure}
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>

      <p className="onboarding-guide-title">Your calendars</p>
      <ParentCalendarTab children={children} />
    </div>
  )
}

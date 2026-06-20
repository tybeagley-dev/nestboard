// Shared coaching for the buried "iCal / Secret address" calendar link, shown
// both in onboarding (expanded) and the parent Calendar tab (collapsed — it's an
// infrequent flow people forget). Google steps carry `figure` screenshot slots;
// drop an image at the matching /onboarding path to replace the placeholder.
const GOOGLE = [
  { text: 'On a computer, open Google Calendar (calendar.google.com) — it’s the same Google account as your Gmail.' },
  { text: 'In the left sidebar, hover the calendar you want, click its ⋮ menu, and choose “Settings and sharing.”', figure: 'calendar-settings' },
  { text: 'Scroll down to the “Integrate calendar” section.', figure: 'calendar-integrate' },
  { text: 'Copy the “Secret address in iCal format” — the long link ending in .ics. (Secret = keep it private; anyone with it can see your events.)', figure: 'calendar-ical' },
  { text: 'Add a calendar below and paste that link into the iCal URL field.' },
]

const APPLE = [
  { text: 'On a Mac, open the Calendar app — or go to iCloud.com and open Calendar.' },
  { text: 'In the sidebar, hover the calendar you want and click the share icon (on iCloud.com, right-click it and choose “Sharing settings”).' },
  { text: 'Turn on “Public Calendar.”' },
  { text: 'Copy the link it shows — it starts with webcal://. Paste it below exactly as-is; we’ll handle the rest.' },
]

function Steps({ steps }) {
  return (
    <ol className="onboarding-guide-steps">
      {steps.map((g, i) => (
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
  )
}

export default function CalendarGuide({ defaultOpen = false }) {
  return (
    <details className="calendar-guide" open={defaultOpen}>
      <summary className="calendar-guide-summary">How to find your calendar link</summary>
      <div className="calendar-guide-body">
        <div className="calendar-guide-section">
          <p className="calendar-guide-heading">Google Calendar</p>
          <Steps steps={GOOGLE} />
        </div>
        <div className="calendar-guide-section">
          <p className="calendar-guide-heading">Apple Calendar (iCloud)</p>
          <Steps steps={APPLE} />
        </div>
      </div>
    </details>
  )
}

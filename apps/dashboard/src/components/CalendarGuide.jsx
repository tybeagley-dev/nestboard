import { useState } from 'react'

// Shared coaching for the buried "iCal / Secret address" calendar link, shown
// both in onboarding (expanded) and the parent Calendar tab (collapsed — it's an
// infrequent flow people forget). Google steps carry `figure` screenshot slots;
// each maps to /onboarding/<figure>.png in public/. Missing image → dashed
// placeholder fallback, so the guide is safe to ship before the assets land.
const GOOGLE = [
  { text: 'On a computer, open Google Calendar (calendar.google.com) — it’s the same Google account as your Gmail.' },
  { text: 'In the left sidebar, hover the calendar you want and click its ⋮ menu.', figure: 'calendar-kebab' },
  { text: 'Choose “Settings and sharing.”', figure: 'calendar-settings' },
  { text: 'Scroll down to the “Integrate calendar” section.', figure: 'calendar-integrate' },
  { text: 'Copy the “Secret address in iCal format” — the long link ending in .ics. (Secret = keep it private; anyone with it can see your events.)', figure: 'calendar-ical' },
  { text: 'Add a calendar below and paste that link into the iCal URL field.' },
]

// Works for iCloud calendars (not Google calendars synced onto the device) and
// can be done entirely on an iPhone — no Mac required.
const APPLE = [
  { text: 'Open the Calendar app on your iPhone (or use a Mac, or iCloud.com → Calendar). This works for calendars stored in iCloud.' },
  { text: 'On iPhone: tap “Calendars” at the bottom, then the ⓘ info button next to the calendar you want. On Mac/web: hover the calendar and open its sharing settings.' },
  { text: 'Turn on “Public Calendar.”' },
  { text: 'Tap “Share Link” and copy it — it starts with webcal://. Paste it below exactly as-is; we’ll handle the rest.' },
]

function Figure({ slot, alt }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return <div className="onboarding-guide-figure" data-slot={slot}>screenshot: {slot}</div>
  }
  return (
    <div className="onboarding-guide-figure onboarding-guide-figure--img">
      <img src={`/onboarding/${slot}.png`} alt={alt} onError={() => setFailed(true)} />
    </div>
  )
}

function Steps({ steps }) {
  return (
    <ol className="onboarding-guide-steps">
      {steps.map((g, i) => (
        <li key={i}>
          <span className="onboarding-guide-text">{g.text}</span>
          {g.figure && <Figure slot={g.figure} alt={g.text} />}
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

// ─────────────────────────────────────────────────────────────────────────────
// FAMILY DASHBOARD CONFIG
// Edit this file to customize everything about the dashboard.
// ─────────────────────────────────────────────────────────────────────────────

export const CONFIG = {

  // ── Family ─────────────────────────────────────────────────────────────────
  familyName: 'Beagley Fam',

  // ── Schedule Modes ─────────────────────────────────────────────────────────
  // The dashboard auto-detects which mode today falls into and shows the
  // matching routines. Dates are YYYY-MM-DD strings (inclusive on both ends).
  schedules: {
    summer: { start: '2026-06-12', end: '2026-08-23' },
    breaks: [
      { name: 'Winter Break',    start: '2025-12-23', end: '2026-01-05' },
      { name: 'Spring Break',    start: '2026-03-30', end: '2026-04-05' },
      { name: 'Thanksgiving',    start: '2026-11-26', end: '2026-11-29' },
      { name: 'MLK Day',         start: '2026-01-19', end: '2026-01-19' },
      { name: 'Presidents Day',  start: '2026-02-16', end: '2026-02-16' },
      { name: 'Memorial Day',    start: '2026-05-25', end: '2026-05-25' },
    ],
  },

  apiUrl: import.meta.env.VITE_API_URL ?? '',

  demoChores: [],

  // ── Calendar Events ────────────────────────────────────────────────────────
  // Add upcoming family events here. Format: YYYY-MM-DD.
  // color is optional — defaults to the accent color.
  events: [],

  // ── Meal Plan ──────────────────────────────────────────────────────────────
  // Keys must match JS day names: Sunday Monday Tuesday Wednesday Thursday Friday Saturday
  meals: {
    Sunday:    { main: 'Roast Chicken',           note: 'with roasted veggies' },
    Monday:    { main: 'Spaghetti Bolognese',     note: 'garlic bread on the side' },
    Tuesday:   { main: 'Chicken Tacos',           note: 'fish option too' },
    Wednesday: { main: 'Stir-fry & Rice',         note: 'use up the veggies' },
    Thursday:  { main: 'Grilled Cheese & Soup',   note: 'tomato bisque' },
    Friday:    { main: 'Homemade Pizza',          note: '🍕 everyone picks a topping' },
    Saturday:  { main: "Everyone's Choice",       note: 'leftovers or takeout' },
  },

  // ── Announcements ──────────────────────────────────────────────────────────
  announcements: [
    'Library books due Tuesday',
    'Soccer cleats need to be washed this weekend',
    'Grandma visits next Saturday — help clean up Friday!',
  ],

  // ── Chore Cool-down ────────────────────────────────────────────────────────
  // Minimum minutes between accepting a spin chore and marking it complete.
  choreCooldownMinutes: 5,

  // ── Screen Time ────────────────────────────────────────────────────────────
  // minutesPerChore: how much screen time is awarded per completed chore
  // timerBufferMinutes: countdown duration when kids choose "Start Timer"
  //   (slightly more than minutesPerChore to give them time to get set up)
  screenTime: {
    minutesPerChore: 30,
    timerBufferMinutes: 35,
  },

  // ── Tidy Timer ─────────────────────────────────────────────────────────────
  // defaultMinutes: pre-selected duration when the popover opens
  //
  // castAppId: your Google Cast receiver App ID.
  //   Leave empty to skip Cast (tidy timer still works, just no music).
  //   Setup steps:
  //     1. Go to cast.google.com/publish → New Application → Custom Receiver
  //     2. Receiver URL: https://YOUR-USERNAME.github.io/kitchen-dashboard/cast-receiver.html
  //     3. Copy the App ID and paste it below
  //     4. Allow up to 15 min for it to propagate to your devices
  //
  // musicPlaylistUrl: a YouTube Music playlist URL
  //   e.g. 'https://music.youtube.com/playlist?list=PLxxxxxx'
  tidyTimer: {
    defaultMinutes: 10,
    castAppId: '',
    musicPlaylistUrl: 'https://www.youtube.com/watch?v=xDK6RA65Rxw&list=RDxDK6RA65Rxw&start_radio=1',
  },

}

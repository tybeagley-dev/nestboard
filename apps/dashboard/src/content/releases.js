// User-facing release notes, newest first. Bundled with the build (same pattern
// as the legal docs) — notes only change when you deploy anyway.
//
// Run `/release-notes` to draft an entry from the commits since the last one.
//
// HOUSE RULES — every entry below has been cut to them. They exist because the
// 2026-08-08/09 entries were originally twelve and ten items of two-clause
// sentences, which reads like a changelog, and nobody finishes a changelog.
//   * Max 6 items. If there are more, the rest weren't worth telling a family.
//   * One line each, under ~110 characters. No second sentence explaining the
//     first. If it needs two, it needs a guide instead.
//   * Lead with the change, not the setup. "Routines are set up once for the
//     whole family now" beats "Routines are now set up once for the whole
//     family instead of once per child."
//   * Fixes start with "Fixed:" and say the symptom, not the cause.
//   * Skip anything invisible — refactors, security work nobody noticed,
//     internal fixes. A release with nothing user-visible gets no entry at all.
//   * Read by children on the kiosk as well as parents. Plain words.
//
// `version` must be unique and is what the unread dot keys off — bump it
// whenever you add an entry. `commit` is the SHA the release was cut at; it is
// never rendered, it is the anchor /release-notes uses to find the next batch.
export const RELEASES = [
  {
    version: '2026.08.11',
    date: 'August 11, 2026',
    commit: '7d1995f',
    title: 'Shared devices, and a tidier parent panel',
    items: [
      'Shared tablets ask for your family PIN once, then stay signed in until you remove them in Settings → Devices.',
      'The parent panel is now Family, Devices and Settings, and you can tap any row to edit it.',
      'Name your board and its greeting yourself, in Settings → Family. Changes show up on the display right away.',
      'Zones and their weekly jobs are edited in one form now, so Cancel actually cancels.',
      'Fixed: child colors were missing on older iPads.',
      'Fixed: the dinner card took the whole column until the weather loaded.',
    ],
  },
  {
    version: '2026.08.09',
    date: 'August 9, 2026',
    title: 'Routines, family notes, and a display link',
    items: [
      'Routines are set up once for the whole family now — add it once, then pick who it applies to.',
      'Routines are grouped into Morning, Evening and Any time, in the order you actually do them.',
      'Family notes are back under the greeting. Add more than one and they take turns.',
      'A child\'s own page now spends tokens and starts timers, the same as the family display.',
      'New: a Family display link in Settings → Family, for a tablet you leave out.',
      'Fixed: the rewards store let you buy things you could not afford.',
    ],
  },
  {
    version: '2026.08.08',
    date: 'August 8, 2026',
    title: 'Chores, tidied up',
    items: [
      'The chore spinner gives you both options from one spin. They are worth the same, so pick either.',
      'Chores can be worth any number of tokens now, and you can set what a day should add up to.',
      'Retiring a chore moves it to Inactive instead of deleting it, so you can bring it back.',
      'New: earn bonus tokens for a day with no screen time. Turn it on under Family settings.',
      'Your token balance shows recent activity, so you can see where they came from and went.',
      'Fixed: a chore that a parent sent back could never be redone.',
    ],
  },
]

// Older entries stay in this file as the record, but the modal only shows the
// most recent few. A family opening "What's new" wants to know what changed
// lately; scrolling last quarter's list to find it is the same problem as an
// over-long entry, one level up.
const MAX_VISIBLE = 3

export const VISIBLE_RELEASES = RELEASES.slice(0, MAX_VISIBLE)

// Deliberately from the full list, not the visible slice — the unread dot tracks
// what's newest, and those are the same entry unless MAX_VISIBLE hits zero.
export const LATEST_RELEASE = RELEASES[0]?.version ?? null

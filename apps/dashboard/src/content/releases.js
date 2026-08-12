// User-facing release notes, newest first. Bundled with the build (same pattern
// as the legal docs) — notes only change when you deploy anyway.
//
// Run `/release-notes` to draft an entry from the commits since the last one.
//
// HOUSE RULES — the 2026-08-08/09 entries predate them and show why they exist:
// twelve items of two-clause sentences reads like a changelog, and nobody
// finishes a changelog.
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
      'Shared tablets now ask for your family PIN once, then stay signed in. Remove one any time from Settings → Devices.',
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
      'Routines are now set up once for the whole family instead of once per child. Add "brush hair", pick who it applies to — most apply to everyone — and editing or removing it changes it for all of them at once.',
      'Routines are grouped into Morning, Evening and Any time, and you can put them in the order you actually do them.',
      'The school calendar setup — summer, holidays, breaks — is tucked away now. You only need it if a routine should skip certain kinds of days.',
      'Family notes appear under the greeting on the dashboard again. Add more than one and they take turns. You\'ll find them in Settings → Family.',
      'On a child\'s own page, the tokens and screen time buttons now work the way they do on the family display — spend tokens, trade for screen time, and start a timer. A timer started there shows its countdown there too.',
      'New: a Family display link in Settings → Family. Open it on a tablet you leave out and it shows the whole board, without signing that tablet in to your account.',
      'You can now sign out, from Settings → Family.',
      'Only the family owner can invite or remove members. Any parent can still change the family PIN, and the owner can hand ownership over.',
      'Fixed: stopping a screen time timer on one device took a while to disappear from the others. It updates straight away now.',
      'Fixed: the rewards store let you buy things you could not afford.',
      'Fixed: a screen time timer could run its full length even with no minutes behind it.',
      'If the family PIN is entered wrong several times, it now pauses and says so, instead of repeating "incorrect".',
    ],
  },
  {
    version: '2026.08.08',
    date: 'August 8, 2026',
    title: 'Chores, tidied up',
    items: [
      'The chore spinner now gives you both options from a single spin — no more spinning twice. Both are worth the same, so pick whichever you like.',
      'Bonus chores are now tagged as bonus in the parent portal, so you can tell them apart at a glance.',
      'Fixed: a chore that a parent sent back could never be redone. It now returns to the list properly.',
      'Chore progress on each card now tracks chores only. Routines keep their own checkmarks, and the celebration waits until everything is done.',
      'Chores can now be worth any number of tokens, not just 1 or 2, and you can set how much chore work a day should add up to.',
      'Retiring a chore no longer deletes it — it moves to Inactive and can be restored. Deleting is now inside the chore editor.',
      'Chores are searchable and filterable once you have a few.',
      'New: earn bonus tokens for a day with no screen time. Turn it on or off, and set the amount, under Family settings.',
      'Your tokens balance now shows recent activity, so you can see where they came from and went.',
      'Guides added for the chore fields and the approvals queue, and the Wallet is explained properly.',
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

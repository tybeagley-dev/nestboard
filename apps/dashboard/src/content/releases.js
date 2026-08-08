// User-facing release notes, newest first. Bundled with the build (same pattern
// as the legal docs) — notes only change when you deploy anyway.
//
// Writing these: they're read by parents AND children on the kiosk, so describe
// what changed for them, not what changed in the code. Skip anything invisible
// (refactors, internal fixes nobody noticed). `version` must be unique and is
// what the unread dot keys off — bump it whenever you add an entry.
export const RELEASES = [
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

export const LATEST_RELEASE = RELEASES[0]?.version ?? null

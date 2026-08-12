---
description: Draft the next user-facing release notes entry from the commits since the last one
---

Draft a new entry for `apps/dashboard/src/content/releases.js`.

The generation here is mechanical — finding the commits, stamping version and date,
appending the entry. **The judgment is not, and must not be automated:** commit
subjects are written for developers, and most commits change nothing a family can
see. Do not translate commits one-to-one into items.

## 1. Find the batch

Read `RELEASES[0]` in `apps/dashboard/src/content/releases.js`.

- If it has a `commit` field: `git log <commit>..HEAD --oneline`
- If not (entries before this command existed): `git log --since="<its date>" --oneline`

Also check `git status` — uncommitted work is not in a release. Say so and stop if
that is all there is.

## 2. Sort, don't translate

For each commit ask: **would a parent or a child notice this without being told?**

- **Include:** new things they can do, changed behavior they'd hit, fixes to
  symptoms they actually saw.
- **Exclude:** refactors, renames, internal cleanups, dependency bumps, docs, and
  security work whose only visible effect is that nothing changed. Several commits
  usually collapse into one item, or into none.

If nothing survives, the answer is **no entry**. Say that rather than padding.
A release note nobody needed teaches families to ignore the next one.

## 3. Write it to the house rules

The rules are in the header comment of `releases.js` — read them, they are the
spec. Summary: **max 6 items, one line each under ~110 characters, lead with the
change, "Fixed:" for fixes, plain words because children read this on the kiosk.**

Check your draft against the two 2026-08 entries in the file. They are the
counterexample: twelve items of two-clause sentences. If your draft reads like
those, cut it.

Then propose the entry **in chat first, before editing the file.** Show which
commits you dropped and why — that list is where the judgment is, and it is the
part worth arguing about.

## 4. Append after approval

Prepend to the `RELEASES` array with:

- `version`: `YYYY.MM.DD` from today's date. Must be unique — it is what the
  unread dot keys off. If there is already an entry for today, this is an edit to
  that entry, not a second one.
- `date`: `Month D, YYYY`
- `commit`: **`git rev-parse HEAD`** — the anchor the next run of this command
  reads. Never rendered. Forgetting it makes the next run fall back to date
  matching, which double-counts.
- `title`: under ~40 characters, names the theme rather than listing it.

Then confirm the dashboard still builds.

## Worth knowing

Notes are bundled into the build, so **a family cannot see an entry announcing an
update they have not yet received** — the ✨ dot only appears once the new bundle
lands on their device. Write for someone already looking at the new version.

The modal shows only the most recent few entries (`MAX_VISIBLE` in
`releases.js`); older ones stay in the file as the record.

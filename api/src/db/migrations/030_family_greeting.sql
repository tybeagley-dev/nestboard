-- The board's headline is "Good Morning," / "<name>!", which forces families.name
-- to double as both the formal family name (invites, portal, member lists) and the
-- second line of a greeting. Those want different words: "Beagley" is the family,
-- "Beagley's" or "Team Beagley" is how the board should address them.
--
-- greeting holds only that second line, everything after the comma. NULL means
-- "derive it" — the UI renders `${name}!`, which is exactly today's behavior, so
-- existing families are unchanged and no backfill is needed.

ALTER TABLE families ADD COLUMN IF NOT EXISTS greeting TEXT;

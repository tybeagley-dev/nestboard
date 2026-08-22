-- 033: Optional per-item store tag. NULL means "unassigned" — every existing
-- row, and anything a child adds from their own page, lands there until a
-- parent files it. Store names live on the item as free text; the family's
-- known store names are mirrored into families.settings.grocery_stores so the
-- add-item suggestions survive a Clear All (which deletes every row and would
-- otherwise wipe the only record of where a family shops).
ALTER TABLE grocery ADD COLUMN IF NOT EXISTS store TEXT;

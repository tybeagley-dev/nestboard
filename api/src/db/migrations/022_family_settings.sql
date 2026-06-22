-- 022: Per-family feature settings. One JSONB column gates optional modules
-- (screen time, tokens, zones, meals, grocery) and holds screen-time tuning
-- (daily free allotment, token cost). Generic-core defaults live in code
-- (FamilyContext.useSettings + the API helper), so an empty {} means "all
-- modules on, 0 free daily minutes, 5 tokens / 10 min" — i.e. current behavior
-- for every family EXCEPT the daily allotment, which now defaults to 0 (opt-in).
-- Beagley is backfilled to their existing 30 free minutes so nothing changes
-- for the original family.
ALTER TABLE families ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

UPDATE families
SET settings = COALESCE(settings, '{}'::jsonb) || '{"screenTime":{"dailyAllotmentMinutes":30}}'::jsonb
WHERE id = 'fam_beagley';

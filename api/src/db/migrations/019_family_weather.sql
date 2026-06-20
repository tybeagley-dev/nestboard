-- 019: Per-family weather location. lat/lon/label move out of the single-tenant
-- config.js into the families table so each family sees their own forecast.
-- Backfill the original Beagley family with their config.js coords; every other
-- family starts NULL (weather pill hidden until they set a location in setup or
-- Settings), so no one inherits Beagley's location.
ALTER TABLE families ADD COLUMN IF NOT EXISTS weather JSONB;
UPDATE families
SET weather = '{"lat":40.310871,"lon":-112.012589,"label":"Eagle Mountain"}'::jsonb
WHERE id = 'fam_beagley'
  AND weather IS NULL;

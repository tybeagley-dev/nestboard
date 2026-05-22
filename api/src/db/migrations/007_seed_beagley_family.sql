-- 007: Seed the Beagley family and backfill family_id on all existing rows.
-- Requires env vars SEED_FAMILY_SLUG and SEED_PARENT_PIN_HASH to be set before running,
-- OR run the seed script (npm run seed:family) which handles hashing automatically.
-- This migration is a no-op if the family already exists.

-- Seeded by the Node seed script (see api/src/db/seedFamily.js).
-- This file is a marker — actual seeding is done via the script to allow bcrypt hashing.
SELECT 1;

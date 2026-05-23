-- 008: Finalize multi-tenant family_id on all tables.
-- Backfills existing rows and enforces NOT NULL.
-- Safe to run on any DB state — all steps are idempotent.

-- Backfill existing rows (no-op if already done or no rows exist)
UPDATE chores             SET family_id = 'fam_beagley' WHERE family_id IS NULL;
UPDATE routine_defs       SET family_id = 'fam_beagley' WHERE family_id IS NULL;
UPDATE mom_store          SET family_id = 'fam_beagley' WHERE family_id IS NULL;
UPDATE chore_events       SET family_id = 'fam_beagley' WHERE family_id IS NULL;
UPDATE spend_events       SET family_id = 'fam_beagley' WHERE family_id IS NULL;
UPDATE grocery            SET family_id = 'fam_beagley' WHERE family_id IS NULL;
UPDATE notes              SET family_id = 'fam_beagley' WHERE family_id IS NULL;
UPDATE announcements      SET family_id = 'fam_beagley' WHERE family_id IS NULL;
UPDATE purchases          SET family_id = 'fam_beagley' WHERE family_id IS NULL;
UPDATE calendars          SET family_id = 'fam_beagley' WHERE family_id IS NULL;
UPDATE bucks_balance      SET family_id = 'fam_beagley' WHERE family_id IS NULL;
UPDATE screen_time_balance SET family_id = 'fam_beagley' WHERE family_id IS NULL;
UPDATE timers             SET family_id = 'fam_beagley' WHERE family_id IS NULL;
UPDATE meals              SET family_id = 'fam_beagley' WHERE family_id IS NULL;
UPDATE routine_log        SET family_id = 'fam_beagley' WHERE family_id IS NULL;

-- Enforce NOT NULL on all family_id columns (no-op if already NOT NULL)
ALTER TABLE chores              ALTER COLUMN family_id SET NOT NULL;
ALTER TABLE routine_defs        ALTER COLUMN family_id SET NOT NULL;
ALTER TABLE mom_store           ALTER COLUMN family_id SET NOT NULL;
ALTER TABLE chore_events        ALTER COLUMN family_id SET NOT NULL;
ALTER TABLE spend_events        ALTER COLUMN family_id SET NOT NULL;
ALTER TABLE grocery             ALTER COLUMN family_id SET NOT NULL;
ALTER TABLE notes               ALTER COLUMN family_id SET NOT NULL;
ALTER TABLE announcements       ALTER COLUMN family_id SET NOT NULL;
ALTER TABLE purchases           ALTER COLUMN family_id SET NOT NULL;
ALTER TABLE calendars           ALTER COLUMN family_id SET NOT NULL;

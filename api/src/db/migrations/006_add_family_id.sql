-- 006: Add family_id to all tables for multi-tenant scoping.
-- Step 1: add nullable columns (safe to run while data exists; skips if column already present)

ALTER TABLE chores             ADD COLUMN IF NOT EXISTS family_id TEXT REFERENCES families(id);
ALTER TABLE routine_defs       ADD COLUMN IF NOT EXISTS family_id TEXT REFERENCES families(id);
ALTER TABLE mom_store          ADD COLUMN IF NOT EXISTS family_id TEXT REFERENCES families(id);
ALTER TABLE chore_events       ADD COLUMN IF NOT EXISTS family_id TEXT REFERENCES families(id);
ALTER TABLE spend_events       ADD COLUMN IF NOT EXISTS family_id TEXT REFERENCES families(id);
ALTER TABLE grocery            ADD COLUMN IF NOT EXISTS family_id TEXT REFERENCES families(id);
ALTER TABLE notes              ADD COLUMN IF NOT EXISTS family_id TEXT REFERENCES families(id);
ALTER TABLE announcements      ADD COLUMN IF NOT EXISTS family_id TEXT REFERENCES families(id);
ALTER TABLE purchases          ADD COLUMN IF NOT EXISTS family_id TEXT REFERENCES families(id);
ALTER TABLE calendars          ADD COLUMN IF NOT EXISTS family_id TEXT REFERENCES families(id);

-- For tables with composite PKs, only rebuild the PK if family_id isn't already part of it.
-- This guard makes the migration a no-op on fresh databases created from the updated schema.sql.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = 'bucks_balance'::regclass AND i.indisprimary AND a.attname = 'family_id'
  ) THEN
    ALTER TABLE bucks_balance ADD COLUMN IF NOT EXISTS family_id TEXT REFERENCES families(id);
    ALTER TABLE bucks_balance DROP CONSTRAINT IF EXISTS bucks_balance_pkey;
    ALTER TABLE bucks_balance ADD CONSTRAINT bucks_balance_pkey PRIMARY KEY (family_id, child);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = 'screen_time_balance'::regclass AND i.indisprimary AND a.attname = 'family_id'
  ) THEN
    ALTER TABLE screen_time_balance ADD COLUMN IF NOT EXISTS family_id TEXT REFERENCES families(id);
    ALTER TABLE screen_time_balance DROP CONSTRAINT IF EXISTS screen_time_balance_pkey;
    ALTER TABLE screen_time_balance ADD CONSTRAINT screen_time_balance_pkey PRIMARY KEY (family_id, child);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = 'timers'::regclass AND i.indisprimary AND a.attname = 'family_id'
  ) THEN
    ALTER TABLE timers ADD COLUMN IF NOT EXISTS family_id TEXT REFERENCES families(id);
    ALTER TABLE timers DROP CONSTRAINT IF EXISTS timers_pkey;
    ALTER TABLE timers ADD CONSTRAINT timers_pkey PRIMARY KEY (family_id, child);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = 'meals'::regclass AND i.indisprimary AND a.attname = 'family_id'
  ) THEN
    ALTER TABLE meals ADD COLUMN IF NOT EXISTS family_id TEXT REFERENCES families(id);
    ALTER TABLE meals DROP CONSTRAINT IF EXISTS meals_pkey;
    ALTER TABLE meals ADD CONSTRAINT meals_pkey PRIMARY KEY (family_id, day);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = 'routine_log'::regclass AND i.indisprimary AND a.attname = 'family_id'
  ) THEN
    ALTER TABLE routine_log ADD COLUMN IF NOT EXISTS family_id TEXT REFERENCES families(id);
    ALTER TABLE routine_log DROP CONSTRAINT IF EXISTS routine_log_pkey;
    ALTER TABLE routine_log ADD CONSTRAINT routine_log_pkey PRIMARY KEY (family_id, date, child, routine_id);
  END IF;
END $$;

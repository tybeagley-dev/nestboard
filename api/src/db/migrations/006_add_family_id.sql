-- 006: Add family_id to all tables for multi-tenant scoping.
-- Step 1: add nullable columns (safe to run while data exists)

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

-- bucks_balance: drop PK on child, add family_id, new composite PK
ALTER TABLE bucks_balance      ADD COLUMN IF NOT EXISTS family_id TEXT REFERENCES families(id);
ALTER TABLE bucks_balance      DROP CONSTRAINT IF EXISTS bucks_balance_pkey;
ALTER TABLE bucks_balance      ADD CONSTRAINT bucks_balance_pkey PRIMARY KEY (family_id, child);

-- screen_time_balance: same pattern
ALTER TABLE screen_time_balance ADD COLUMN IF NOT EXISTS family_id TEXT REFERENCES families(id);
ALTER TABLE screen_time_balance DROP CONSTRAINT IF EXISTS screen_time_balance_pkey;
ALTER TABLE screen_time_balance ADD CONSTRAINT screen_time_balance_pkey PRIMARY KEY (family_id, child);

-- timers: same pattern
ALTER TABLE timers              ADD COLUMN IF NOT EXISTS family_id TEXT REFERENCES families(id);
ALTER TABLE timers              DROP CONSTRAINT IF EXISTS timers_pkey;
ALTER TABLE timers              ADD CONSTRAINT timers_pkey PRIMARY KEY (family_id, child);

-- meals: drop PK on day, add family_id, new composite PK
ALTER TABLE meals               ADD COLUMN IF NOT EXISTS family_id TEXT REFERENCES families(id);
ALTER TABLE meals               DROP CONSTRAINT IF EXISTS meals_pkey;
ALTER TABLE meals               ADD CONSTRAINT meals_pkey PRIMARY KEY (family_id, day);

-- routine_log: drop composite PK, add family_id, new composite PK
ALTER TABLE routine_log         ADD COLUMN IF NOT EXISTS family_id TEXT REFERENCES families(id);
ALTER TABLE routine_log         DROP CONSTRAINT IF EXISTS routine_log_pkey;
ALTER TABLE routine_log         ADD CONSTRAINT routine_log_pkey PRIMARY KEY (family_id, date, child, routine_id);

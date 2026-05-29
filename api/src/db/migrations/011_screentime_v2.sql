-- Rename balance → purchased_balance if the old column still exists (idempotent for fresh installs)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'screen_time_balance' AND column_name = 'balance'
  ) THEN
    ALTER TABLE screen_time_balance RENAME COLUMN balance TO purchased_balance;
  END IF;
END $$;

ALTER TABLE screen_time_balance
  ADD COLUMN IF NOT EXISTS daily_free_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_free_date DATE    NOT NULL DEFAULT CURRENT_DATE;

ALTER TABLE timers
  ADD COLUMN IF NOT EXISTS free_minutes      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS purchased_minutes INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS screentime_purchase_requests (
  id             SERIAL PRIMARY KEY,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  family_id      TEXT NOT NULL REFERENCES families(id),
  child_id       TEXT NOT NULL REFERENCES children(id),
  bucks_amount   INTEGER NOT NULL,
  minutes_amount INTEGER NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS screentime_abstinence_requests (
  id            SERIAL PRIMARY KEY,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  family_id     TEXT NOT NULL REFERENCES families(id),
  child_id      TEXT NOT NULL REFERENCES children(id),
  date          DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  bucks_awarded INTEGER NOT NULL DEFAULT 15,
  UNIQUE (family_id, child_id, date)
);

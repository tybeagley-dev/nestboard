-- Hearthboard schema
-- Run via: npm run migrate

-- Chore definitions (replaces Chores sheet)
CREATE TABLE IF NOT EXISTS chores (
  id          TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  bucks       INTEGER NOT NULL DEFAULT 0,
  icon        TEXT NOT NULL DEFAULT '',
  active      BOOLEAN NOT NULL DEFAULT true,
  required    BOOLEAN NOT NULL DEFAULT false,
  days        TEXT[] NOT NULL DEFAULT '{}',
  instructions TEXT[] NOT NULL DEFAULT '{}',
  max_per_week INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Routine definitions (replaces RoutineDefs sheet + config.js routines)
CREATE TABLE IF NOT EXISTS routine_defs (
  id          TEXT PRIMARY KEY,
  child       TEXT NOT NULL,
  label       TEXT NOT NULL,
  icon        TEXT NOT NULL DEFAULT '',
  schedules   TEXT[] NOT NULL DEFAULT '{}',
  time        TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mom Store items (replaces MomStore sheet)
CREATE TABLE IF NOT EXISTS mom_store (
  id                TEXT PRIMARY KEY,
  label             TEXT NOT NULL,
  icon              TEXT NOT NULL DEFAULT '',
  cost              INTEGER NOT NULL DEFAULT 0,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  active            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bucks balances per child (replaces Bucks sheet)
CREATE TABLE IF NOT EXISTS bucks_balance (
  child      TEXT PRIMARY KEY,
  balance    INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Screen time balances per child (replaces ScreenTime sheet)
CREATE TABLE IF NOT EXISTS screen_time_balance (
  child      TEXT PRIMARY KEY,
  balance    INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chore event log (replaces History sheet)
-- status: accepted | pending_approval | completed | rejected
CREATE TABLE IF NOT EXISTS chore_events (
  id          SERIAL PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  child       TEXT NOT NULL,
  chore_id    TEXT NOT NULL,
  chore_label TEXT NOT NULL,
  bucks       INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'accepted',
  accepted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS chore_events_child_date ON chore_events (child, created_at);
CREATE INDEX IF NOT EXISTS chore_events_status ON chore_events (status);

-- Spend event log (replaces SpendHistory sheet)
-- type: trade | mom_store | adjustment
CREATE TABLE IF NOT EXISTS spend_events (
  id         SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  child      TEXT NOT NULL,
  amount     INTEGER NOT NULL,
  type       TEXT
);

-- Routine completion log (replaces RoutineLog sheet)
-- One row per (date, child, routine_id) — upserted on toggle
CREATE TABLE IF NOT EXISTS routine_log (
  date       DATE NOT NULL,
  child      TEXT NOT NULL,
  routine_id TEXT NOT NULL,
  completed  BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (date, child, routine_id)
);

-- Active screen time timers (replaces localStorage timers — now cross-device)
CREATE TABLE IF NOT EXISTS timers (
  child            TEXT PRIMARY KEY,
  end_time         BIGINT NOT NULL,
  deducted_minutes INTEGER NOT NULL DEFAULT 0,
  total_ms         BIGINT NOT NULL,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Grocery list (replaces Grocery sheet)
CREATE TABLE IF NOT EXISTS grocery (
  id       TEXT PRIMARY KEY,
  item     TEXT NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Weekly meal plan (replaces Meals sheet)
-- day: Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday
CREATE TABLE IF NOT EXISTS meals (
  day   TEXT PRIMARY KEY,
  main  TEXT NOT NULL DEFAULT '',
  note  TEXT NOT NULL DEFAULT '',
  lunch TEXT NOT NULL DEFAULT ''
);

-- Sticky notes (replaces Notes sheet)
CREATE TABLE IF NOT EXISTS notes (
  id       TEXT PRIMARY KEY,
  text     TEXT NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Announcements (replaces Announcements sheet)
CREATE TABLE IF NOT EXISTS announcements (
  id       TEXT PRIMARY KEY,
  text     TEXT NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mom Store purchases (replaces Purchases sheet)
CREATE TABLE IF NOT EXISTS purchases (
  id          TEXT PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  child       TEXT NOT NULL,
  item_id     TEXT NOT NULL,
  item_label  TEXT NOT NULL,
  cost        INTEGER NOT NULL,
  redeemed    BOOLEAN NOT NULL DEFAULT false,
  redeemed_at TIMESTAMPTZ
);

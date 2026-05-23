-- Hearthboard schema
-- Run via: npm run migrate

-- ── Multi-tenant root tables ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS families (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  slug             TEXT NOT NULL UNIQUE,  -- opaque nanoid used in URLs
  parent_pin_hash  TEXT NOT NULL,         -- bcrypt hash of parent PIN
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS children (
  id         TEXT PRIMARY KEY,
  family_id  TEXT NOT NULL REFERENCES families(id),
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#888888',
  emoji      TEXT NOT NULL DEFAULT '👤',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (family_id, name)
);

-- ── Chore definitions (replaces Chores sheet)
CREATE TABLE IF NOT EXISTS chores (
  id           TEXT PRIMARY KEY,
  family_id    TEXT NOT NULL REFERENCES families(id),
  label        TEXT NOT NULL,
  bucks        INTEGER NOT NULL DEFAULT 0,
  icon         TEXT NOT NULL DEFAULT '',
  active       BOOLEAN NOT NULL DEFAULT true,
  required     BOOLEAN NOT NULL DEFAULT false,
  days         TEXT[] NOT NULL DEFAULT '{}',
  instructions TEXT[] NOT NULL DEFAULT '{}',
  max_per_week INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Routine definitions (replaces RoutineDefs sheet + config.js routines)
CREATE TABLE IF NOT EXISTS routine_defs (
  id         TEXT PRIMARY KEY,
  family_id  TEXT NOT NULL REFERENCES families(id),
  child      TEXT NOT NULL,
  label      TEXT NOT NULL,
  icon       TEXT NOT NULL DEFAULT '',
  schedules  TEXT[] NOT NULL DEFAULT '{}',
  time       TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mom Store items (replaces MomStore sheet)
CREATE TABLE IF NOT EXISTS mom_store (
  id                TEXT PRIMARY KEY,
  family_id         TEXT NOT NULL REFERENCES families(id),
  label             TEXT NOT NULL,
  icon              TEXT NOT NULL DEFAULT '',
  cost              INTEGER NOT NULL DEFAULT 0,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  active            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bucks balances per child (replaces Bucks sheet)
CREATE TABLE IF NOT EXISTS bucks_balance (
  family_id  TEXT NOT NULL REFERENCES families(id),
  child      TEXT NOT NULL,
  balance    INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (family_id, child)
);

-- Screen time balances per child (replaces ScreenTime sheet)
CREATE TABLE IF NOT EXISTS screen_time_balance (
  family_id  TEXT NOT NULL REFERENCES families(id),
  child      TEXT NOT NULL,
  balance    INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (family_id, child)
);

-- Chore event log (replaces History sheet)
-- status: accepted | pending_approval | completed | rejected
CREATE TABLE IF NOT EXISTS chore_events (
  id          SERIAL PRIMARY KEY,
  family_id   TEXT NOT NULL REFERENCES families(id),
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
  family_id  TEXT NOT NULL REFERENCES families(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  child      TEXT NOT NULL,
  amount     INTEGER NOT NULL,
  type       TEXT
);

-- Routine completion log (replaces RoutineLog sheet)
-- One row per (family_id, date, child, routine_id) — upserted on toggle
CREATE TABLE IF NOT EXISTS routine_log (
  family_id  TEXT NOT NULL REFERENCES families(id),
  date       DATE NOT NULL,
  child      TEXT NOT NULL,
  routine_id TEXT NOT NULL,
  completed  BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (family_id, date, child, routine_id)
);

-- Active screen time timers (replaces localStorage timers — now cross-device)
CREATE TABLE IF NOT EXISTS timers (
  family_id        TEXT NOT NULL REFERENCES families(id),
  child            TEXT NOT NULL,
  end_time         BIGINT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  buffer_minutes   INTEGER NOT NULL DEFAULT 5,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (family_id, child)
);

-- Grocery list (replaces Grocery sheet)
CREATE TABLE IF NOT EXISTS grocery (
  id        TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id),
  item      TEXT NOT NULL,
  added_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Weekly meal plan (replaces Meals sheet)
-- day: Sunday | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday
CREATE TABLE IF NOT EXISTS meals (
  family_id TEXT NOT NULL REFERENCES families(id),
  day       TEXT NOT NULL,
  main      TEXT NOT NULL DEFAULT '',
  note      TEXT NOT NULL DEFAULT '',
  lunch     TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (family_id, day)
);

-- Sticky notes (replaces Notes sheet)
CREATE TABLE IF NOT EXISTS notes (
  id        TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id),
  text      TEXT NOT NULL,
  added_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Announcements (replaces Announcements sheet)
CREATE TABLE IF NOT EXISTS announcements (
  id        TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id),
  text      TEXT NOT NULL,
  added_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mom Store purchases (replaces Purchases sheet)
CREATE TABLE IF NOT EXISTS purchases (
  id          TEXT PRIMARY KEY,
  family_id   TEXT NOT NULL REFERENCES families(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  child       TEXT NOT NULL,
  item_id     TEXT NOT NULL,
  item_label  TEXT NOT NULL,
  cost        INTEGER NOT NULL,
  redeemed    BOOLEAN NOT NULL DEFAULT false,
  redeemed_at TIMESTAMPTZ
);

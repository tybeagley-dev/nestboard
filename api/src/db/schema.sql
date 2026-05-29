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

-- ── Chore definitions ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chores (
  id           TEXT PRIMARY KEY,
  family_id    TEXT REFERENCES families(id),
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

-- ── Routine definitions ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS routine_defs (
  id         TEXT PRIMARY KEY,
  family_id  TEXT REFERENCES families(id),
  child_id   TEXT NOT NULL REFERENCES children(id),
  label      TEXT NOT NULL,
  icon       TEXT NOT NULL DEFAULT '',
  schedules  TEXT[] NOT NULL DEFAULT '{}',
  time       TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Mom Store ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mom_store (
  id                TEXT PRIMARY KEY,
  family_id         TEXT REFERENCES families(id),
  label             TEXT NOT NULL,
  icon              TEXT NOT NULL DEFAULT '',
  cost              INTEGER NOT NULL DEFAULT 0,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  active            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Per-child balances ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bucks_balance (
  family_id  TEXT NOT NULL REFERENCES families(id),
  child_id   TEXT NOT NULL REFERENCES children(id),
  balance    INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (family_id, child_id)
);

CREATE TABLE IF NOT EXISTS screen_time_balance (
  family_id         TEXT NOT NULL REFERENCES families(id),
  child_id          TEXT NOT NULL REFERENCES children(id),
  purchased_balance INTEGER NOT NULL DEFAULT 0,
  daily_free_used   INTEGER NOT NULL DEFAULT 0,
  daily_free_date   DATE    NOT NULL DEFAULT CURRENT_DATE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (family_id, child_id)
);

-- ── Event logs ────────────────────────────────────────────────────────────────

-- status: accepted | pending_approval | completed | rejected
CREATE TABLE IF NOT EXISTS chore_events (
  id          SERIAL PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  family_id   TEXT NOT NULL REFERENCES families(id),
  child_id    TEXT NOT NULL REFERENCES children(id),
  chore_id    TEXT NOT NULL,
  chore_label TEXT NOT NULL,
  bucks       INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'accepted',
  accepted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS chore_events_status ON chore_events (status);

-- type: trade | mom_store | adjustment
CREATE TABLE IF NOT EXISTS spend_events (
  id         SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  family_id  TEXT NOT NULL REFERENCES families(id),
  child_id   TEXT NOT NULL REFERENCES children(id),
  amount     INTEGER NOT NULL,
  type       TEXT
);

-- ── Routine log ───────────────────────────────────────────────────────────────

-- One row per (family_id, date, child_id, routine_id) — upserted on toggle
CREATE TABLE IF NOT EXISTS routine_log (
  family_id  TEXT NOT NULL REFERENCES families(id),
  date       DATE NOT NULL,
  child_id   TEXT NOT NULL REFERENCES children(id),
  routine_id TEXT NOT NULL,
  completed  BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (family_id, date, child_id, routine_id)
);

-- ── Timers ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS timers (
  family_id         TEXT NOT NULL REFERENCES families(id),
  child_id          TEXT NOT NULL REFERENCES children(id),
  end_time          BIGINT NOT NULL,
  duration_minutes  INTEGER NOT NULL DEFAULT 0,
  buffer_minutes    INTEGER NOT NULL DEFAULT 5,
  free_minutes      INTEGER NOT NULL DEFAULT 0,
  purchased_minutes INTEGER NOT NULL DEFAULT 0,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (family_id, child_id)
);

-- ── Screentime requests ───────────────────────────────────────────────────────

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

-- ── Purchases ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS purchases (
  id          TEXT PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  family_id   TEXT NOT NULL REFERENCES families(id),
  child_id    TEXT NOT NULL REFERENCES children(id),
  item_id     TEXT NOT NULL,
  item_label  TEXT NOT NULL,
  cost        INTEGER NOT NULL,
  redeemed    BOOLEAN NOT NULL DEFAULT false,
  redeemed_at TIMESTAMPTZ
);

-- ── Calendars ─────────────────────────────────────────────────────────────────

-- child_id is nullable: NULL means family-wide calendar
CREATE TABLE IF NOT EXISTS calendars (
  id        TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id),
  name      TEXT NOT NULL,
  url       TEXT NOT NULL,
  color     TEXT NOT NULL DEFAULT '#C17A4A',
  child_id  TEXT REFERENCES children(id)
);

-- ── Shared / family-level tables ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS grocery (
  id       TEXT PRIMARY KEY,
  family_id TEXT REFERENCES families(id),
  item     TEXT NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meals (
  family_id TEXT NOT NULL REFERENCES families(id),
  day       TEXT NOT NULL,
  main      TEXT NOT NULL DEFAULT '',
  note      TEXT NOT NULL DEFAULT '',
  lunch     TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (family_id, day)
);

CREATE TABLE IF NOT EXISTS notes (
  id        TEXT PRIMARY KEY,
  family_id TEXT REFERENCES families(id),
  text      TEXT NOT NULL,
  added_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcements (
  id        TEXT PRIMARY KEY,
  family_id TEXT REFERENCES families(id),
  text      TEXT NOT NULL,
  added_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Zones: named household areas
CREATE TABLE IF NOT EXISTS zones (
  id                  TEXT PRIMARY KEY,
  family_id           TEXT NOT NULL REFERENCES families(id),
  label               TEXT NOT NULL,
  icon                TEXT NOT NULL DEFAULT '',
  eligible_child_ids  TEXT[] NOT NULL DEFAULT '{}',
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (family_id, label)
);

-- Zone items: specific tasks within a zone
CREATE TABLE IF NOT EXISTS zone_items (
  id         TEXT PRIMARY KEY,
  zone_id    TEXT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  family_id  TEXT NOT NULL REFERENCES families(id),
  label      TEXT NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Zone assignments: one auto + unlimited manual per child per week
CREATE TABLE IF NOT EXISTS zone_assignments (
  id         TEXT PRIMARY KEY,
  family_id  TEXT NOT NULL REFERENCES families(id),
  child_id   TEXT NOT NULL REFERENCES children(id),
  zone_id    TEXT NOT NULL REFERENCES zones(id),
  week_of    DATE NOT NULL,
  is_auto    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exactly one auto-assignment per child per week
CREATE UNIQUE INDEX IF NOT EXISTS zone_assignments_auto_unique
  ON zone_assignments (family_id, child_id, week_of)
  WHERE is_auto = true;

-- Junction: which specific items are included in an assignment
CREATE TABLE IF NOT EXISTS zone_assignment_items (
  assignment_id TEXT NOT NULL REFERENCES zone_assignments(id) ON DELETE CASCADE,
  zone_item_id  TEXT NOT NULL REFERENCES zone_items(id) ON DELETE CASCADE,
  PRIMARY KEY (assignment_id, zone_item_id)
);

-- Daily check-ins: morning / noon / evening per assignment per day
CREATE TABLE IF NOT EXISTS zone_check_log (
  family_id     TEXT NOT NULL REFERENCES families(id),
  child_id      TEXT NOT NULL REFERENCES children(id),
  assignment_id TEXT NOT NULL REFERENCES zone_assignments(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  period        TEXT NOT NULL CHECK (period IN ('morning', 'noon', 'evening')),
  completed     BOOLEAN NOT NULL DEFAULT false,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (child_id, assignment_id, date, period)
);

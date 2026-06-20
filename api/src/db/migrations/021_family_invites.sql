-- 021: Family invites. Token-based join that doesn't require sharing the parent
-- PIN. Single-use by default, time-limited. Role is 'parent' for now (the only
-- non-owner role); the column lets that expand later without a migration.
CREATE TABLE IF NOT EXISTS family_invites (
  token       TEXT PRIMARY KEY,
  family_id   TEXT NOT NULL REFERENCES families(id),
  role        TEXT NOT NULL DEFAULT 'parent',
  created_by  TEXT NOT NULL REFERENCES users(id),
  expires_at  TIMESTAMPTZ NOT NULL,
  max_uses    INTEGER NOT NULL DEFAULT 1,
  used_count  INTEGER NOT NULL DEFAULT 0,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_family_invites_family ON family_invites(family_id);

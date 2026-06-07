CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,  -- Clerk user ID (user_xxx)
  email      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS family_memberships (
  user_id   TEXT NOT NULL REFERENCES users(id),
  family_id TEXT NOT NULL REFERENCES families(id),
  role      TEXT NOT NULL DEFAULT 'parent',
  PRIMARY KEY (user_id, family_id)
);

-- 024: Beta feedback + account-deletion requests. One table for both, keyed by
-- 'type'. Surfaced in the admin tooling (no email/push-to-admin infra yet).
-- family_id/user_id are SET NULL on delete so a request survives as an audit
-- trail even after its family is removed — and so admin family-delete doesn't
-- need to clear this table first.
CREATE TABLE IF NOT EXISTS feedback (
  id          SERIAL PRIMARY KEY,
  family_id   TEXT REFERENCES families(id) ON DELETE SET NULL,
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  type        TEXT NOT NULL DEFAULT 'feedback',  -- feedback | deletion_request
  message     TEXT,
  status      TEXT NOT NULL DEFAULT 'open',       -- open | resolved
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status, created_at DESC);

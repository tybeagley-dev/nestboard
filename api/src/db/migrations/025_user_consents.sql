-- 025: Per-user consent to the Terms of Service + Privacy Policy. Append-only so
-- re-consent to a future doc version is recorded as a new row (history). Versions
-- are the docs' effective dates; the server records its own current versions.
CREATE TABLE IF NOT EXISTS user_consents (
  id              SERIAL PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  privacy_version TEXT NOT NULL,
  tos_version     TEXT NOT NULL,
  accepted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_consents_user ON user_consents(user_id, accepted_at DESC);

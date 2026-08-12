-- 031: Per-device tokens for the two surfaces that cannot hold a Clerk session,
-- the kiosk and the child views. Until now both authenticated with the family
-- slug, which is a bearer credential sitting in the URL: it never expires, can't
-- be rotated without breaking every installed PWA, and is one secret for the
-- whole household. The realistic adversaries — a curious kid, a forwarded link,
-- a borrowed tablet — all defeat entropy entirely, so the fix isn't a better
-- secret, it's a REVOCABLE one.
--
-- A parent pairs a device in person by entering the family PIN on it. The PIN
-- authorizes the act of pairing; the token that comes out stands on its own
-- afterwards. Changing the PIN therefore does NOT unpair anything — it stops new
-- pairings and kills live parent sessions, but the fridge display keeps working.
-- The lever for "this device should stop working" is revoking that device.
--
-- token_hash is SHA-256, deliberately not bcrypt. This is checked on EVERY
-- request, and unlike the 6-digit PIN the secret is 32 random bytes, so there is
-- nothing for slow hashing to defend against — it would only buy a cost-12
-- bcrypt per API call.
CREATE TABLE IF NOT EXISTS device_tokens (
  id           TEXT PRIMARY KEY,
  family_id    TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  label        TEXT NOT NULL,
  -- 'kiosk' | 'child'. Which surface paired, for the revoke list only; a token
  -- is family-wide either way. A device is a device, and anyone who can pair
  -- already holds the PIN, so scoping a token to one child grants nothing.
  kind         TEXT NOT NULL DEFAULT 'kiosk',
  child_id     TEXT,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Throttled: written only when already an hour stale, so this isn't a write
  -- per request.
  last_seen_at TIMESTAMPTZ,
  -- Revocation is a tombstone, not a delete: the row is what the parent sees in
  -- the Devices list, and keeping it means a revoked device stays explainable.
  revoked_at   TIMESTAMPTZ
);

-- The hot path: every authenticated kiosk/child request looks a token up by hash
-- and needs to know whether it is still live.
CREATE INDEX IF NOT EXISTS idx_device_tokens_active
  ON device_tokens (token_hash) WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_device_tokens_family ON device_tokens (family_id);

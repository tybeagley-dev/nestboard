-- Parent-granted minutes get their own bucket. Previously grants landed in
-- purchased_balance, which deductions may never touch — so once a kid's free
-- allotment was spent, a parent could add time but never take it back, and the
-- minus buttons greyed out for the rest of the day.
--
-- Three provenances, three rules:
--   daily free   — resets nightly, parent may deduct
--   bonus        — parent-granted, persists, parent may deduct
--   purchased    — bought with tokens, persists, parent may NOT deduct
ALTER TABLE screen_time_balance
  ADD COLUMN IF NOT EXISTS bonus_balance INTEGER NOT NULL DEFAULT 0;

-- Timers spend free → bonus → purchased, so each source needs its own tally for
-- the early-stop refund to return minutes to the bucket they came from.
ALTER TABLE timers
  ADD COLUMN IF NOT EXISTS bonus_minutes INTEGER NOT NULL DEFAULT 0;

ALTER TABLE screen_time_sessions
  ADD COLUMN IF NOT EXISTS bonus_minutes INTEGER NOT NULL DEFAULT 0;

-- No backfill: grants made between 026 and 027 are indistinguishable from token
-- purchases (nothing recorded provenance), so existing purchased_balance stays
-- put. Only new grants land in the bonus bucket.

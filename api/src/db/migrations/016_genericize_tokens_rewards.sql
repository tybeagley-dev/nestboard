-- 016: genericize domain naming — bucks→tokens, mom_store→rewards — and add the
-- per-family labels layer that renders custom names over the generic core.
--
-- Renames are metadata-only (instant, data preserved). Everything is guarded so the
-- migration is safe to re-run and tolerant of the empty placeholder tables that
-- schema.sql (run before migrations by migrate.js) creates on an existing DB.

-- ── Custom-render layer: per-family display labels over the generic core ───────
-- e.g. { "tokenName": "Beagley Bucks", "tokenNameSingular": "Beagley Buck",
--        "rewardsName": "Mom Store" }. Empty default → UI falls back to generic.
ALTER TABLE families
  ADD COLUMN IF NOT EXISTS labels JSONB NOT NULL DEFAULT '{}';

-- ── Table renames ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- mom_store → rewards
  IF to_regclass('public.mom_store') IS NOT NULL THEN
    -- schema.sql may have just created an empty rewards placeholder; clear it
    IF to_regclass('public.rewards') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM rewards LIMIT 1) THEN
      DROP TABLE rewards;
    END IF;
    IF to_regclass('public.rewards') IS NULL THEN
      ALTER TABLE mom_store RENAME TO rewards;
    END IF;
  END IF;

  -- bucks_balance → token_balance
  IF to_regclass('public.bucks_balance') IS NOT NULL THEN
    IF to_regclass('public.token_balance') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM token_balance LIMIT 1) THEN
      DROP TABLE token_balance;
    END IF;
    IF to_regclass('public.token_balance') IS NULL THEN
      ALTER TABLE bucks_balance RENAME TO token_balance;
    END IF;
  END IF;
END $$;

-- ── Column renames ────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='chores' AND column_name='bucks') THEN
    ALTER TABLE chores RENAME COLUMN bucks TO tokens;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='chore_events' AND column_name='bucks') THEN
    ALTER TABLE chore_events RENAME COLUMN bucks TO tokens;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='screentime_purchase_requests' AND column_name='bucks_amount') THEN
    ALTER TABLE screentime_purchase_requests RENAME COLUMN bucks_amount TO tokens_amount;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='screentime_abstinence_requests' AND column_name='bucks_awarded') THEN
    ALTER TABLE screentime_abstinence_requests RENAME COLUMN bucks_awarded TO tokens_awarded;
  END IF;
END $$;

-- ── PK / FK constraint renames (keep names aligned with the renamed tables) ────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='mom_store_pkey') THEN
    ALTER TABLE rewards RENAME CONSTRAINT mom_store_pkey TO rewards_pkey;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='mom_store_family_id_fkey') THEN
    ALTER TABLE rewards RENAME CONSTRAINT mom_store_family_id_fkey TO rewards_family_id_fkey;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='bucks_balance_pkey') THEN
    ALTER TABLE token_balance RENAME CONSTRAINT bucks_balance_pkey TO token_balance_pkey;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='bucks_balance_family_id_fkey') THEN
    ALTER TABLE token_balance RENAME CONSTRAINT bucks_balance_family_id_fkey TO token_balance_family_id_fkey;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='bucks_balance_child_id_fkey') THEN
    ALTER TABLE token_balance RENAME CONSTRAINT bucks_balance_child_id_fkey TO token_balance_child_id_fkey;
  END IF;
END $$;

-- ── Data: spend_events.type enum value 'mom_store' → 'rewards' ─────────────────
UPDATE spend_events SET type = 'rewards' WHERE type = 'mom_store';

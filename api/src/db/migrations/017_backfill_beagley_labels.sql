-- 017: Backfill the existing Beagley family's display labels.
-- 016 added families.labels defaulting to '{}', which renders the generic
-- "Tokens"/"Rewards Store". This sets the original family's custom names so the
-- rename is invisible to them. Fills only when empty — never clobbers later edits.
UPDATE families
SET labels = '{"tokenName":"Beagley Bucks","tokenNameSingular":"Beagley Buck","rewardsName":"Mom Store"}'::jsonb
WHERE id = 'fam_beagley'
  AND (labels IS NULL OR labels = '{}'::jsonb);

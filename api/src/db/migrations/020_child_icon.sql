-- 020: Child avatar icons. Adds children.icon (a lucide icon name) alongside the
-- legacy emoji column (left in place, no longer rendered). Best-effort backfill
-- maps existing emoji to the closest curated icon; anything unmatched defaults to
-- 'user'. Families can re-pick in the icon picker.
ALTER TABLE children ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT 'user';

UPDATE children SET icon = CASE
  WHEN emoji LIKE '%🚀%'                      THEN 'rocket'
  WHEN emoji LIKE '%🐱%' OR emoji LIKE '%🐈%' THEN 'cat'
  WHEN emoji LIKE '%🐶%' OR emoji LIKE '%🐕%' THEN 'dog'
  WHEN emoji LIKE '%🐰%' OR emoji LIKE '%🐇%' THEN 'rabbit'
  WHEN emoji LIKE '%🐢%'                      THEN 'turtle'
  WHEN emoji LIKE '%🐦%' OR emoji LIKE '%🐤%' THEN 'bird'
  WHEN emoji LIKE '%🐟%' OR emoji LIKE '%🐠%' THEN 'fish'
  WHEN emoji LIKE '%🦄%'                      THEN 'sparkles'
  WHEN emoji LIKE '%⚾%' OR emoji LIKE '%🏀%'
    OR emoji LIKE '%⚽%' OR emoji LIKE '%🏈%'  THEN 'trophy'
  WHEN emoji LIKE '%⭐%' OR emoji LIKE '%🌟%' THEN 'star'
  WHEN emoji LIKE '%❤%' OR emoji LIKE '%💜%'
    OR emoji LIKE '%💙%' OR emoji LIKE '%💖%'  THEN 'heart'
  WHEN emoji LIKE '%🎮%'                      THEN 'gamepad-2'
  WHEN emoji LIKE '%🎵%' OR emoji LIKE '%🎶%' THEN 'music'
  WHEN emoji LIKE '%🌸%' OR emoji LIKE '%🌺%'
    OR emoji LIKE '%🌼%' OR emoji LIKE '%🌷%'  THEN 'flower'
  WHEN emoji LIKE '%🚗%' OR emoji LIKE '%🚙%' THEN 'car'
  WHEN emoji LIKE '%✈%'                       THEN 'plane'
  WHEN emoji LIKE '%🍕%'                      THEN 'pizza'
  WHEN emoji LIKE '%👑%'                      THEN 'crown'
  WHEN emoji LIKE '%👻%'                      THEN 'ghost'
  ELSE 'user'
END
WHERE icon = 'user';

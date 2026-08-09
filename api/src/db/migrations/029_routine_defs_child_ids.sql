-- Routines become family-level entities that apply to N children, instead of one
-- row per (child, routine). Mirrors the chores.child_ids pattern (migration 023):
-- an empty array means "applies to every child", so new children inherit routines.
--
-- routine_log is deliberately NOT restructured — it is already keyed
-- (family_id, date, child_id, routine_id), so a single shared def logs one
-- completion row per child with no schema change. Only routine_id values are
-- remapped where duplicate defs collapse into a survivor.

ALTER TABLE routine_defs ADD COLUMN IF NOT EXISTS child_ids TEXT[] NOT NULL DEFAULT '{}';

-- child_id is no longer the owning key; shared routines have no single child.
-- Kept (nullable) for one release so a rollback still has the original value.
ALTER TABLE routine_defs ALTER COLUMN child_id DROP NOT NULL;

-- Backfill: every existing def applies to exactly the child it belonged to.
UPDATE routine_defs
   SET child_ids = ARRAY[child_id]
 WHERE child_ids = '{}' AND child_id IS NOT NULL;

-- ── Collapse duplicates ───────────────────────────────────────────────────────
-- Conservative key: same family, label (case/whitespace-insensitive), icon,
-- schedule set (order-independent) and time. Anything differing in any of those
-- is left alone as a separate routine — near-duplicates are reported by
-- scripts/routine-merge-report.sql rather than guessed at here.

CREATE TEMP TABLE routine_norm ON COMMIT DROP AS
SELECT rd.id,
       rd.family_id,
       rd.child_id,
       rd.created_at,
       lower(btrim(rd.label)) AS label_key,
       rd.icon                AS icon_key,
       COALESCE((SELECT array_agg(s ORDER BY s) FROM unnest(rd.schedules) s), '{}') AS sched_key,
       COALESCE(rd.time, '')  AS time_key
  FROM routine_defs rd;

CREATE TEMP TABLE routine_groups ON COMMIT DROP AS
SELECT family_id, label_key, icon_key, sched_key, time_key,
       (array_agg(id ORDER BY created_at, id))[1] AS survivor_id,
       array_agg(DISTINCT child_id) FILTER (WHERE child_id IS NOT NULL) AS merged_child_ids
  FROM routine_norm
 GROUP BY family_id, label_key, icon_key, sched_key, time_key;

CREATE TEMP TABLE routine_merge_map ON COMMIT DROP AS
SELECT n.id AS old_id, g.survivor_id
  FROM routine_norm n
  JOIN routine_groups g
    ON g.family_id  = n.family_id
   AND g.label_key  = n.label_key
   AND g.icon_key   = n.icon_key
   AND g.sched_key  = n.sched_key
   AND g.time_key   = n.time_key
 WHERE n.id <> g.survivor_id;

-- Survivor covers every child its group's members covered.
UPDATE routine_defs rd
   SET child_ids = g.merged_child_ids
  FROM routine_groups g
 WHERE rd.id = g.survivor_id
   AND g.merged_child_ids IS NOT NULL;

-- Drop log rows that would collide with the survivor's own row for the same
-- child+date (only possible if a child held two identical defs).
DELETE FROM routine_log rl
 USING routine_merge_map m
 WHERE rl.routine_id = m.old_id
   AND EXISTS (
     SELECT 1 FROM routine_log x
      WHERE x.family_id  = rl.family_id
        AND x.date       = rl.date
        AND x.child_id   = rl.child_id
        AND x.routine_id = m.survivor_id
   );

UPDATE routine_log rl
   SET routine_id = m.survivor_id
  FROM routine_merge_map m
 WHERE rl.routine_id = m.old_id;

DELETE FROM routine_defs rd
 USING routine_merge_map m
 WHERE rd.id = m.old_id;

-- ── Re-sequence ───────────────────────────────────────────────────────────────
-- sort_order was per-child; it is now per (family, time-of-day group).

WITH ordered AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY family_id, COALESCE(time, '')
           ORDER BY sort_order, label
         ) - 1 AS seq
    FROM routine_defs
)
UPDATE routine_defs rd
   SET sort_order = o.seq
  FROM ordered o
 WHERE rd.id = o.id;

CREATE INDEX IF NOT EXISTS idx_routine_defs_family ON routine_defs (family_id);

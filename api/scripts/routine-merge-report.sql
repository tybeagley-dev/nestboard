-- Routine merge report — run BEFORE and AFTER migration 029 and diff the output.
--
--   psql "$DATABASE_URL" -f api/scripts/routine-merge-report.sql > /tmp/routines-before.txt
--   npm run db:migrate
--   psql "$DATABASE_URL" -f api/scripts/routine-merge-report.sql > /tmp/routines-after.txt
--   diff /tmp/routines-before.txt /tmp/routines-after.txt
--
-- Expected after: defs drop to the "distinct routines" count, log rows are
-- UNCHANGED (a collapse remaps routine_id, it does not delete history), and
-- "would merge" is empty. Any log-row loss is a collision drop — investigate.
--
-- Section 6 errors on the BEFORE run (child_ids does not exist yet). Expected;
-- psql continues past it.

\echo '=== 1. Per-family totals (defs should fall to distinct_routines; logs should not move) ==='
SELECT f.slug,
       COUNT(rd.id)                                        AS defs,
       COUNT(DISTINCT lower(btrim(rd.label)))              AS distinct_labels,
       COUNT(DISTINCT (lower(btrim(rd.label)), rd.icon,
              COALESCE((SELECT array_agg(s ORDER BY s) FROM unnest(rd.schedules) s), '{}'),
              COALESCE(rd.time, '')))                      AS distinct_routines
  FROM families f
  LEFT JOIN routine_defs rd ON rd.family_id = f.id
 GROUP BY f.slug
 ORDER BY f.slug;

\echo ''
\echo '=== 2. Total routine_log rows (MUST be identical before and after) ==='
SELECT COUNT(*) AS routine_log_rows FROM routine_log;

\echo ''
\echo '=== 3. Orphaned log rows (routine_id with no matching def) ==='
SELECT COUNT(*) AS orphaned_log_rows
  FROM routine_log rl
 WHERE NOT EXISTS (SELECT 1 FROM routine_defs rd WHERE rd.id = rl.routine_id);

\echo ''
\echo '=== 4. Groups that WOULD merge (empty after migration) ==='
SELECT f.slug,
       lower(btrim(rd.label)) AS label,
       rd.icon,
       COALESCE(rd.time, '(any)') AS time,
       COUNT(*)               AS rows_collapsing
  FROM routine_defs rd
  JOIN families f ON f.id = rd.family_id
 GROUP BY f.slug, lower(btrim(rd.label)), rd.icon,
          COALESCE((SELECT array_agg(s ORDER BY s) FROM unnest(rd.schedules) s), '{}'),
          COALESCE(rd.time, '')
HAVING COUNT(*) > 1
 ORDER BY f.slug, rows_collapsing DESC;

\echo ''
\echo '=== 5. Near-duplicates that will NOT merge (same label, differing icon/schedules/time) ==='
\echo '    These stay separate on purpose — review and merge by hand if wrong.'
SELECT f.slug,
       lower(btrim(rd.label)) AS label,
       COUNT(DISTINCT (rd.icon,
              COALESCE((SELECT array_agg(s ORDER BY s) FROM unnest(rd.schedules) s), '{}'),
              COALESCE(rd.time, ''))) AS variants
  FROM routine_defs rd
  JOIN families f ON f.id = rd.family_id
 GROUP BY f.slug, lower(btrim(rd.label))
HAVING COUNT(DISTINCT (rd.icon,
              COALESCE((SELECT array_agg(s ORDER BY s) FROM unnest(rd.schedules) s), '{}'),
              COALESCE(rd.time, ''))) > 1
 ORDER BY f.slug, variants DESC;

\echo ''
\echo '=== 6. Post-migration shape (all zero/empty before 029 runs) ==='
SELECT COUNT(*) FILTER (WHERE child_ids = '{}')            AS applies_to_everyone,
       COUNT(*) FILTER (WHERE array_length(child_ids,1) = 1) AS single_child,
       COUNT(*) FILTER (WHERE array_length(child_ids,1) > 1) AS multi_child
  FROM routine_defs;

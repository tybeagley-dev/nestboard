-- Rename zone_items → micro_zones (the assignable unit)
ALTER TABLE zone_items RENAME TO micro_zones;

-- Clear existing assignments (zone_id-based model is invalid now)
-- zone_check_log cascades automatically
DELETE FROM zone_assignment_items;
DELETE FROM zone_assignments;

-- Drop junction table (no longer needed — assignment is 1:1 with a micro_zone)
DROP TABLE zone_assignment_items;

-- Swap zone_id for micro_zone_id on zone_assignments
ALTER TABLE zone_assignments DROP COLUMN zone_id;
ALTER TABLE zone_assignments ADD COLUMN micro_zone_id TEXT REFERENCES micro_zones(id) ON DELETE CASCADE;

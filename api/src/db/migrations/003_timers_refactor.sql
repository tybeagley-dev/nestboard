-- Rename deducted_minutes → duration_minutes (the actual paid minutes)
ALTER TABLE timers RENAME COLUMN deducted_minutes TO duration_minutes;

-- Store setup buffer separately so refund math is unambiguous
ALTER TABLE timers ADD COLUMN IF NOT EXISTS buffer_minutes INTEGER NOT NULL DEFAULT 5;

-- total_ms is now derivable: (duration_minutes + buffer_minutes) * 60000
ALTER TABLE timers DROP COLUMN IF EXISTS total_ms;

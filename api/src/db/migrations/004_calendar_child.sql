-- Associate calendars with a specific child (nullable = family-wide calendar)
ALTER TABLE calendars ADD COLUMN IF NOT EXISTS child TEXT;

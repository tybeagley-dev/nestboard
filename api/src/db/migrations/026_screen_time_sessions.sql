-- Screen-time usage becomes an event log. `screen_time_balance.daily_free_used`
-- is a balance cache with one day of memory and four writers; deriving "did this
-- kid watch yesterday" from it was wrong (a zero daily allotment made every kid
-- look abstinent forever, and parent deductions looked like usage).
CREATE TABLE IF NOT EXISTS screen_time_sessions (
  id                SERIAL PRIMARY KEY,
  family_id         TEXT NOT NULL REFERENCES families(id),
  child_id          TEXT NOT NULL REFERENCES children(id),
  date              DATE NOT NULL,          -- family-local date the session started
  free_minutes      INTEGER NOT NULL DEFAULT 0,
  purchased_minutes INTEGER NOT NULL DEFAULT 0,
  started_at        TIMESTAMPTZ,
  ended_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS screen_time_sessions_lookup
  ON screen_time_sessions (family_id, child_id, date);

-- Existing families have no session history, so without a floor the abstinence
-- job would file a request for every kid the first night after deploy. Stamp the
-- rollout date; the job ignores any date before it. New families never get the
-- key and need no floor — they have sessions from day one.
-- Built with || rather than jsonb_set: jsonb_set won't create the intermediate
-- 'screenTime' object when a family has none, and would silently no-op.
UPDATE families
SET settings = COALESCE(settings, '{}'::jsonb)
  || jsonb_build_object(
       'screenTime',
       COALESCE(settings -> 'screenTime', '{}'::jsonb)
         || jsonb_build_object('sessionsSince', to_char(CURRENT_DATE, 'YYYY-MM-DD'))
     )
WHERE COALESCE(settings, '{}'::jsonb) -> 'screenTime' ->> 'sessionsSince' IS NULL;

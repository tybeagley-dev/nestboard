-- 023: Optionally scope an auto-assigned (required) chore to a subset of kids.
-- child_ids is a list of children.id; empty array (the default) means "all kids",
-- preserving current behavior. Only consulted for required chores — spin chores
-- are pulled from the shared pool regardless. No FK (Postgres arrays can't carry
-- one); a stale id from a deleted child simply never matches, which is harmless.
ALTER TABLE chores ADD COLUMN IF NOT EXISTS child_ids TEXT[] NOT NULL DEFAULT '{}';

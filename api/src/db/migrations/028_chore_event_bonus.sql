-- Bonus ("extra") spins were only ever flagged client-side: ChoreModal wrote
-- `extra: true` into localStorage, nothing read it, and the next hydrate from the
-- API dropped it. Persisting it here is what lets a parent tell a bonus chore
-- from a regular one in Assigned Today and Approvals.
ALTER TABLE chore_events
  ADD COLUMN IF NOT EXISTS is_bonus BOOLEAN NOT NULL DEFAULT false;

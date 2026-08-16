-- 032: Remove child-scoped push notifications.
--
-- A push endpoint stored against a child_id is a live channel for contacting one
-- named child on their own device, outside the app. That is online contact
-- information under COPPA, and it is specifically excluded from the "support for
-- internal operations" exemption that covers our device tokens (031) — so unlike
-- everything else we hold about a child, it needed verifiable parental consent.
--
-- What it bought: two messages, "Chore approved!" and "Screen time approved!",
-- both confirmations of an action a parent had just taken, and both already
-- reflected on the child's board in real time by SSE. Small feature, largest
-- single compliance obligation in the product. Removed rather than consented.
--
-- Dropping the column, not just clearing it, so the capability cannot come back
-- by accident: reintroducing child push now requires a deliberate migration, at
-- which point the consent question gets asked again on purpose.
--
-- DESTRUCTIVE: deletes every child-scoped subscription. Parent subscriptions
-- (child_id IS NULL) are preserved. Nothing is recoverable from this, but push
-- endpoints are regenerable — a parent re-enabling notifications mints a new one.

DELETE FROM push_subscriptions WHERE child_id IS NOT NULL;

ALTER TABLE push_subscriptions DROP COLUMN IF EXISTS child_id;

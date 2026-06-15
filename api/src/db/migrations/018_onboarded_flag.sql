-- 018: Onboarding gate. New families run the setup wizard (onboarded defaults false);
-- families that already exist at deploy time are configured, so mark them onboarded
-- so they're never thrown into the wizard.
ALTER TABLE families ADD COLUMN IF NOT EXISTS onboarded BOOLEAN NOT NULL DEFAULT false;
UPDATE families SET onboarded = true WHERE onboarded = false;

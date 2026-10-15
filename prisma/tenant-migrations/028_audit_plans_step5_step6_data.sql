-- Persist Step 5 (verification) and Step 6 (closure) form data on the audit plan.
ALTER TABLE audit_plans ADD COLUMN IF NOT EXISTS step_5_data jsonb;
ALTER TABLE audit_plans ADD COLUMN IF NOT EXISTS step_6_data jsonb;

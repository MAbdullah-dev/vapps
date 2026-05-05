-- Improve org issues workspace query performance.
-- Safe for repeated runs during tenant provisioning/backfills.
CREATE INDEX IF NOT EXISTS "idx_issues_site_id" ON "issues" ("siteId");
CREATE INDEX IF NOT EXISTS "idx_issues_process_id" ON "issues" ("processId");
CREATE INDEX IF NOT EXISTS "idx_issues_status" ON "issues" ("status");
CREATE INDEX IF NOT EXISTS "idx_issues_order_created_at" ON "issues" ("order", "createdAt");

-- 026_tenant_schema_remaining_parity.sql
-- Idempotent catch-up for tenant DBs provisioned before tracked migrations or partial applies.
-- Safe to re-run; complements 025_* files.

-- Dashboard widgets: recent activity toggle (org dashboard settings)
ALTER TABLE "dashboard_widgets" ADD COLUMN IF NOT EXISTS "recentActivity" BOOLEAN NOT NULL DEFAULT true;

-- Organization profile fields (settings UI + logo)
ALTER TABLE "organization_info" ADD COLUMN IF NOT EXISTS "legalName" TEXT;
ALTER TABLE "organization_info" ADD COLUMN IF NOT EXISTS "taxId" TEXT;
ALTER TABLE "organization_info" ADD COLUMN IF NOT EXISTS "companySize" TEXT;
ALTER TABLE "organization_info" ADD COLUMN IF NOT EXISTS "foundedDate" TEXT;
ALTER TABLE "organization_info" ADD COLUMN IF NOT EXISTS "supportEmail" TEXT;
ALTER TABLE "organization_info" ADD COLUMN IF NOT EXISTS "fax" TEXT;
ALTER TABLE "organization_info" ADD COLUMN IF NOT EXISTS "brandColor" TEXT;
ALTER TABLE "organization_info" ADD COLUMN IF NOT EXISTS "brandFont" TEXT;
ALTER TABLE "organization_info" ADD COLUMN IF NOT EXISTS "logo" TEXT;

-- Issues workspace / KPI parity
ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "deadline" TIMESTAMP(3);
ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "siteId" TEXT;
ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "issuer" TEXT;
ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "verifier" TEXT;
ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "comments" JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS "idx_issues_issuer" ON "issues"("issuer");
CREATE INDEX IF NOT EXISTS "idx_issues_verifier" ON "issues"("verifier");
CREATE INDEX IF NOT EXISTS "idx_issues_site_id" ON "issues" ("siteId");

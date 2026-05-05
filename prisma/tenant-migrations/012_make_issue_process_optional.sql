-- Make issues independent from process (optional linkage).
-- Supports standalone issues at site level with optional process association.

ALTER TABLE "issues"
  ADD COLUMN IF NOT EXISTS "siteId" TEXT;

-- Backfill siteId from linked process when available.
UPDATE "issues" i
SET "siteId" = p."siteId"
FROM "processes" p
WHERE i."processId" IS NOT NULL
  AND i."processId" = p."id"
  AND i."siteId" IS NULL;

-- Allow processId to be nullable for standalone issues.
ALTER TABLE "issues"
  ALTER COLUMN "processId" DROP NOT NULL;

-- Recreate foreign keys with SET NULL behavior.
ALTER TABLE "issues" DROP CONSTRAINT IF EXISTS "issues_processId_fkey";
ALTER TABLE "issues"
  ADD CONSTRAINT "issues_processId_fkey"
  FOREIGN KEY ("processId") REFERENCES "processes"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "issues" DROP CONSTRAINT IF EXISTS "issues_siteId_fkey";
ALTER TABLE "issues"
  ADD CONSTRAINT "issues_siteId_fkey"
  FOREIGN KEY ("siteId") REFERENCES "sites"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "idx_issues_siteId" ON "issues"("siteId");

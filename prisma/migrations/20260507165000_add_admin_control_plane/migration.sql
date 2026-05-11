-- Add global user blocking controls
ALTER TABLE "User"
ADD COLUMN "isBlocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "blockedAt" TIMESTAMP(3),
ADD COLUMN "blockReason" TEXT;

-- Add organization lifecycle controls
ALTER TABLE "Organization"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN "statusUpdatedAt" TIMESTAMP(3),
ADD COLUMN "statusReason" TEXT;

-- Create admin audit log table
CREATE TABLE "AdminActionLog" (
  "id" TEXT NOT NULL,
  "adminUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "reason" TEXT,
  "metadata" JSONB,
  "organizationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminActionLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminActionLog_createdAt_idx" ON "AdminActionLog"("createdAt");
CREATE INDEX "AdminActionLog_targetType_targetId_idx" ON "AdminActionLog"("targetType", "targetId");
CREATE INDEX "AdminActionLog_adminUserId_idx" ON "AdminActionLog"("adminUserId");
CREATE INDEX "AdminActionLog_organizationId_idx" ON "AdminActionLog"("organizationId");

ALTER TABLE "AdminActionLog"
ADD CONSTRAINT "AdminActionLog_adminUserId_fkey"
FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdminActionLog"
ADD CONSTRAINT "AdminActionLog_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

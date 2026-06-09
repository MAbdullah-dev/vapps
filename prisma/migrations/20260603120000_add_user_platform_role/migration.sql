-- Platform-wide admin role (separate from org-level UserOrganization.role)
ALTER TABLE "User" ADD COLUMN "platformRole" TEXT NOT NULL DEFAULT 'user';

CREATE INDEX "User_platformRole_idx" ON "User"("platformRole");

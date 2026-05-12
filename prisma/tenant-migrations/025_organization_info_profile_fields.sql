-- Extended organization profile (settings UI + logo). Safe if columns already exist.
ALTER TABLE "organization_info" ADD COLUMN IF NOT EXISTS "legalName" TEXT;
ALTER TABLE "organization_info" ADD COLUMN IF NOT EXISTS "taxId" TEXT;
ALTER TABLE "organization_info" ADD COLUMN IF NOT EXISTS "companySize" TEXT;
ALTER TABLE "organization_info" ADD COLUMN IF NOT EXISTS "foundedDate" TEXT;
ALTER TABLE "organization_info" ADD COLUMN IF NOT EXISTS "supportEmail" TEXT;
ALTER TABLE "organization_info" ADD COLUMN IF NOT EXISTS "fax" TEXT;
ALTER TABLE "organization_info" ADD COLUMN IF NOT EXISTS "brandColor" TEXT;
ALTER TABLE "organization_info" ADD COLUMN IF NOT EXISTS "brandFont" TEXT;
ALTER TABLE "organization_info" ADD COLUMN IF NOT EXISTS "logo" TEXT;

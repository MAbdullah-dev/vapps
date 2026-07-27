import type { PrismaClient } from "@prisma/client";
import {
  getSeedSuperAdminEmail,
  seedDefaultSuperAdmin,
} from "@/lib/seed-default-super-admin";
import { seedDefaultAuditChecklists } from "@/lib/seed-default-audit-checklists";

/**
 * Master DB seed: default super admin + global audit checklists.
 * Safe to run repeatedly (idempotent). Does not promote other users.
 */
export async function runMasterDbSeed(db: PrismaClient): Promise<void> {
  const seedResult = await seedDefaultSuperAdmin(db);
  const email = getSeedSuperAdminEmail();

  switch (seedResult) {
    case "created":
      console.log(`[seed] Created super admin: ${email}`);
      break;
    case "promoted":
      console.log(`[seed] Promoted existing user to super_admin: ${email}`);
      break;
    case "exists":
      console.log(`[seed] Super admin already exists: ${email}`);
      break;
    case "skipped":
      break;
  }

  await seedDefaultAuditChecklists(db);
}

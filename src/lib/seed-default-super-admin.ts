import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PLATFORM_ROLES } from "@/lib/platform-roles";

export type SeedDefaultSuperAdminResult = "created" | "promoted" | "exists" | "skipped";

const DEFAULT_EMAIL = "superadmin@vietech.pro";
const DEFAULT_NAME = "Super Admin";
/** Dev-only fallback; override with SEED_SUPER_ADMIN_PASSWORD in .env */
const DEV_DEFAULT_PASSWORD = "SuperAdmin123!";

export function getSeedSuperAdminEmail(): string {
  return (process.env.SEED_SUPER_ADMIN_EMAIL ?? DEFAULT_EMAIL).trim().toLowerCase();
}

export function getSeedSuperAdminPassword(): string | null {
  const fromEnv = process.env.SEED_SUPER_ADMIN_PASSWORD?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") return null;
  return DEV_DEFAULT_PASSWORD;
}

/**
 * Idempotent: creates the default platform super admin if missing, or promotes an existing user.
 * Does not reset passwords for existing accounts.
 */
export async function seedDefaultSuperAdmin(
  db: PrismaClient
): Promise<SeedDefaultSuperAdminResult> {
  const email = getSeedSuperAdminEmail();
  const password = getSeedSuperAdminPassword();

  if (!password) {
    console.warn(
      "[seed] Skipping default super admin in production (set SEED_SUPER_ADMIN_PASSWORD to create)."
    );
    return "skipped";
  }

  const existing = await db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, platformRole: true },
  });

  if (!existing) {
    const hashedPassword = await bcrypt.hash(password, 12);
    try {
      await db.user.create({
        data: {
          email,
          name: process.env.SEED_SUPER_ADMIN_NAME?.trim() || DEFAULT_NAME,
          password: hashedPassword,
          emailVerified: new Date(),
          platformRole: PLATFORM_ROLES.SUPER_ADMIN,
        },
      });
      return "created";
    } catch (error: unknown) {
      const code =
        error && typeof error === "object" && "code" in error
          ? (error as { code: string }).code
          : undefined;
      if (code === "P2002") return "exists";
      throw error;
    }
  }

  if (existing.platformRole !== PLATFORM_ROLES.SUPER_ADMIN) {
    await db.user.update({
      where: { id: existing.id },
      data: { platformRole: PLATFORM_ROLES.SUPER_ADMIN },
    });
    return "promoted";
  }

  return "exists";
}

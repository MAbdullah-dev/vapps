#!/usr/bin/env node
/**
 * Set the platform super admin's password and make sure the account can log in.
 *
 *   SEED_SUPER_ADMIN_PASSWORD='...' node scripts/reset-super-admin-password.js [email]
 *
 * `prisma db seed` deliberately never resets an existing account's password, so
 * this is the supported way to recover a locked-out super admin. It also clears
 * isBlocked, verifies the email, and promotes platformRole to super_admin —
 * every gate the admin portal checks.
 *
 * The password is read from the environment, not argv, so it does not land in
 * shell history. It is never printed.
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
try {
  require("dotenv").config();
} catch {
  // Optional. PM2/CI inject env directly.
}

const prisma = new PrismaClient();

async function main() {
  const email = (
    process.argv[2] ||
    process.env.SEED_SUPER_ADMIN_EMAIL ||
    "superadmin@vietech.pro"
  )
    .trim()
    .toLowerCase();

  const password = process.env.SEED_SUPER_ADMIN_PASSWORD?.trim();
  if (!password) {
    console.error(
      "SEED_SUPER_ADMIN_PASSWORD is not set. Pass it in the environment, not as an argument."
    );
    process.exitCode = 1;
    return;
  }
  if (password.length < 12) {
    console.error("Refusing to set a password shorter than 12 characters.");
    process.exitCode = 1;
    return;
  }

  console.log("database:", (process.env.DATABASE_URL || "(unset)").replace(/\/\/[^@]*@/, "//***@"));
  console.log("email:   ", email);

  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });

  const hashedPassword = await bcrypt.hash(password, 12);

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        password: hashedPassword,
        platformRole: "super_admin",
        emailVerified: new Date(),
        isBlocked: false,
        blockedAt: null,
        blockReason: null,
      },
    });
    console.log("\n✅ Password reset. Account is super_admin, verified, and unblocked.");
  } else {
    await prisma.user.create({
      data: {
        email,
        name: process.env.SEED_SUPER_ADMIN_NAME?.trim() || "Super Admin",
        password: hashedPassword,
        emailVerified: new Date(),
        platformRole: "super_admin",
      },
    });
    console.log("\n✅ Created a new super admin account.");
  }

  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL?.trim();
  console.log(`\n   Sign in here — and only here: ${adminUrl || "(NEXT_PUBLIC_ADMIN_URL is unset)"}/auth`);
  console.log("   This changed ONLY the database printed above. Any other");
  console.log("   deployment has its own database and is unaffected.");
  console.log("   Two-factor settings were left untouched.");
}

main()
  .catch((error) => {
    console.error("ERROR:", error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

#!/usr/bin/env node
/**
 * Diagnose why a platform super admin cannot sign in.
 *
 *   node scripts/check-super-admin.js [email]
 *
 * Runs against whatever DATABASE_URL points at, and prints that (with the
 * password masked) first — logging into the wrong environment is the most
 * common cause. Never reads password or 2FA secret values, only whether they
 * are set.
 */

const { PrismaClient } = require("@prisma/client");
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
  const where = { email: { equals: email, mode: "insensitive" } };

  console.log("database:", (process.env.DATABASE_URL || "(unset)").replace(/\/\/[^@]*@/, "//***@"));
  console.log("email:   ", email);

  const user = await prisma.user.findFirst({
    where,
    select: {
      email: true,
      name: true,
      platformRole: true,
      emailVerified: true,
      isBlocked: true,
      twoFactorEnabled: true,
      createdAt: true,
    },
  });

  if (!user) {
    console.log("\n❌ No such user in this database.");
    console.log("   Login will say: 'Invalid email or password'.");
    console.log("   Fix: set SEED_SUPER_ADMIN_PASSWORD and run `npx prisma db seed`.");
    return;
  }

  const [missingPassword, missingSecret] = await Promise.all([
    prisma.user.count({ where: { ...where, password: null } }),
    prisma.user.count({ where: { ...where, twoFactorSecret: null } }),
  ]);

  const problems = [];
  if (user.platformRole !== "super_admin") {
    problems.push(
      `platformRole is '${user.platformRole}', not 'super_admin' — the admin portal signs you straight back out.`
    );
  }
  if (!user.emailVerified) {
    problems.push("emailVerified is null — login asks you to verify your email first.");
  }
  if (user.isBlocked) {
    problems.push("isBlocked is true — login says 'Invalid email or password'.");
  }
  if (missingPassword > 0) {
    problems.push(
      "password is null (OAuth-only account) — password login is impossible until one is set."
    );
  }
  if (user.twoFactorEnabled && missingSecret > 0) {
    problems.push(
      "twoFactorEnabled is true but twoFactorSecret is null — login is stuck at the 2FA step."
    );
  }

  console.log(
    "\n" +
      JSON.stringify(
        {
          name: user.name,
          platformRole: user.platformRole,
          emailVerified: Boolean(user.emailVerified),
          isBlocked: user.isBlocked,
          twoFactorEnabled: user.twoFactorEnabled,
          hasPassword: missingPassword === 0,
          createdAt: user.createdAt,
        },
        null,
        2
      )
  );

  if (problems.length === 0) {
    console.log("\n✅ This account can sign in on the admin host.");
    console.log("   If login still fails here, the password is simply wrong:");
    console.log("   `npx prisma db seed` does NOT reset an existing password.");
    console.log("   Fix: SEED_SUPER_ADMIN_PASSWORD=... node scripts/reset-super-admin-password.js");
    return;
  }

  console.log("\n❌ Problems found:");
  for (const problem of problems) console.log(`   - ${problem}`);
}

main()
  .catch((error) => {
    console.error("ERROR:", error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

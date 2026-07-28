#!/usr/bin/env node
/**
 * Reports User rows whose emails collide when compared case-insensitively.
 *
 * Emails are now normalized to lowercase on write, and a unique index on
 * lower(email) is applied by the 20260728000000_normalize_user_email_case
 * migration. That migration aborts if duplicates exist — run this first to see
 * exactly which accounts need merging.
 *
 * Usage: npm run auth:check-duplicate-emails
 */

const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();

  try {
    const groups = await prisma.$queryRaw`
      SELECT lower("email") AS email_lower, count(*)::int AS row_count
      FROM "User"
      WHERE "email" IS NOT NULL
      GROUP BY lower("email")
      HAVING count(*) > 1
      ORDER BY count(*) DESC, lower("email") ASC
    `;

    if (groups.length === 0) {
      console.log("✅ No case-variant duplicate emails found.");
      console.log("   Safe to run: npx prisma migrate deploy");
      return;
    }

    console.log(
      `⚠️  Found ${groups.length} email address(es) duplicated across accounts:\n`
    );

    for (const group of groups) {
      const users = await prisma.user.findMany({
        where: { email: { equals: group.email_lower, mode: "insensitive" } },
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true,
          platformRole: true,
          createdAt: true,
          lastActive: true,
          _count: { select: { accounts: true, organizations: true } },
        },
        orderBy: { createdAt: "asc" },
      });

      console.log(`${group.email_lower}  (${group.row_count} rows)`);
      for (const u of users) {
        console.log(
          [
            `  - id=${u.id}`,
            `stored="${u.email}"`,
            `verified=${u.emailVerified ? "yes" : "NO"}`,
            `role=${u.platformRole}`,
            `oauth=${u._count.accounts}`,
            `orgs=${u._count.organizations}`,
            `created=${u.createdAt.toISOString().slice(0, 10)}`,
            `lastActive=${u.lastActive ? u.lastActive.toISOString().slice(0, 10) : "never"}`,
          ].join("  ")
        );
      }
      console.log("");
    }

    console.log("Resolve each group before migrating. Usual approach:");
    console.log("  1. Keep the row with org memberships / OAuth accounts / recent activity.");
    console.log("  2. Move any needed memberships onto that row.");
    console.log("  3. Delete or re-address the redundant row(s).");
    console.log("\nThen run: npx prisma migrate deploy");

    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Failed to check duplicate emails:", err);
  process.exit(1);
});

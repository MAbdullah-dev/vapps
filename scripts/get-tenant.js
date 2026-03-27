#!/usr/bin/env node
/**
 * Reusable helper to resolve tenant DB connection details from master DB.
 *
 * Usage:
 *   node scripts/get-tenant.js --slug stellixsoft
 *   node scripts/get-tenant.js --id <org-id>
 *   node scripts/get-tenant.js --slug stellixsoft --env
 *   node scripts/get-tenant.js --slug stellixsoft --field connectionString
 */

const { PrismaClient } = require("@prisma/client");

function parseArgs(argv) {
  const out = {
    slug: "",
    id: "",
    field: "",
    env: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--slug") out.slug = argv[i + 1] || "";
    if (token === "--id") out.id = argv[i + 1] || "";
    if (token === "--field") out.field = argv[i + 1] || "";
    if (token === "--env") out.env = true;
  }

  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.slug && !args.id) {
    console.error("Provide --slug <org-slug> or --id <org-id>.");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const where = args.slug ? { slug: args.slug } : { id: args.id };
    const org = await prisma.organization.findUnique({
      where,
      include: { database: true },
    });

    if (!org || !org.database) {
      console.error("Organization or tenant database details not found.");
      process.exit(2);
    }

    const payload = {
      id: org.id,
      slug: org.slug,
      name: org.name,
      dbName: org.database.dbName,
      dbHost: org.database.dbHost,
      dbPort: org.database.dbPort,
      dbUser: org.database.dbUser,
      connectionString: org.database.connectionString,
    };

    if (args.field) {
      if (!(args.field in payload)) {
        console.error(`Unknown field: ${args.field}`);
        process.exit(3);
      }
      process.stdout.write(String(payload[args.field]) + "\n");
      return;
    }

    if (args.env) {
      process.stdout.write(`TENANT_URL='${payload.connectionString}'\n`);
      return;
    }

    process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Failed to resolve tenant connection:", error);
  process.exit(10);
});


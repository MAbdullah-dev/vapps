#!/usr/bin/env node
/**
 * Applies only tenant SQL migrations that have not been recorded yet.
 * Uses table `tenant_schema_migrations` in the tenant DB (created on first run).
 *
 * Usage:
 *   node scripts/run-pending-tenant-migrations.js --url "postgresql://..."
 *   node scripts/run-pending-tenant-migrations.js --slug stellixsoft
 *   npm run tenant:migrate-pending -- --slug stellixsoft
 *
 * If this tenant already had older migrations applied manually (no tracking table),
 * skip re-running 001–019 by starting at the first file you still need:
 *   npm run tenant:migrate-pending -- --slug stellixsoft --from 20
 *
 * One-time: mark migrations numbered below N as already applied (no SQL run):
 *   npm run tenant:migrate-pending -- --slug stellixsoft --baseline 19
 *
 * Do NOT use this to re-run the full chain on a brand-new empty DB if you prefer
 * `runTenantMigrations` from org create — this is for existing tenants catching up.
 */

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const { PrismaClient } = require("@prisma/client");

function parseArgs(argv) {
  const out = { url: "", slug: "", id: "", dryRun: false, from: 0, baseline: 0 };
  for (let i = 0; i < argv.length; i += 1) {
    const t = argv[i];
    if (t === "--url") out.url = argv[i + 1] || "";
    if (t === "--slug") out.slug = argv[i + 1] || "";
    if (t === "--id") out.id = argv[i + 1] || "";
    if (t === "--dry-run") out.dryRun = true;
    if (t === "--from") out.from = parseInt(argv[i + 1] || "0", 10) || 0;
    if (t === "--baseline") out.baseline = parseInt(argv[i + 1] || "0", 10) || 0;
  }
  return out;
}

function sslOption(connectionString) {
  if (/sslmode=disable/i.test(connectionString)) return false;
  if (/localhost|127\.0\.0\.1/i.test(connectionString)) return false;
  return { rejectUnauthorized: false };
}

function sortMigrationFiles(files) {
  return files
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => {
      const numA = parseInt(a.match(/^(\d+)_/)?.[1] || "0", 10);
      const numB = parseInt(b.match(/^(\d+)_/)?.[1] || "0", 10);
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });
}

async function resolveTenantUrl(args) {
  if (args.url) return args.url.trim();
  if (!args.slug && !args.id) {
    console.error("Provide --url <connectionString> or --slug / --id (like get-tenant.js).");
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    const where = args.slug ? { slug: args.slug } : { id: args.id };
    const org = await prisma.organization.findUnique({
      where,
      include: { database: true },
    });
    const url = org?.database?.connectionString?.trim() || "";
    if (!url) {
      console.error("Organization or tenant connection string not found.");
      process.exit(2);
    }
    return url;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const tenantUrl = await resolveTenantUrl(args);

  const migrationsDir = path.join(process.cwd(), "prisma", "tenant-migrations");
  if (!fs.existsSync(migrationsDir)) {
    console.error("Missing folder:", migrationsDir);
    process.exit(1);
  }

  const allFiles = sortMigrationFiles(fs.readdirSync(migrationsDir));

  const client = new Client({
    connectionString: tenantUrl,
    ssl: sslOption(tenantUrl),
  });

  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS tenant_schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const appliedRes = await client.query(`SELECT filename FROM tenant_schema_migrations ORDER BY filename`);
  const applied = new Set(appliedRes.rows.map((r) => r.filename));

  if (args.baseline > 0 && !args.dryRun) {
    const toMark = allFiles.filter((f) => {
      const n = parseInt(f.match(/^(\d+)_/)?.[1] || "0", 10);
      return n < args.baseline && !applied.has(f);
    });
    for (const file of toMark) {
      await client.query(
        `INSERT INTO tenant_schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING`,
        [file]
      );
    }
    if (toMark.length) console.log(`Baseline: marked ${toMark.length} migration(s) as applied (< ${args.baseline}).`);
    toMark.forEach((f) => applied.add(f));
  }

  let pending = allFiles.filter((f) => !applied.has(f));
  if (args.from > 0) {
    pending = pending.filter((f) => {
      const n = parseInt(f.match(/^(\d+)_/)?.[1] || "0", 10);
      return n >= args.from;
    });
  }

  if (pending.length === 0) {
    console.log("No pending tenant migrations. Database is up to date.");
    await client.end();
    return;
  }

  console.log(`Pending migrations (${pending.length}):`);
  pending.forEach((f) => console.log(`  - ${f}`));

  if (args.dryRun) {
    console.log("(dry-run: not executing)");
    await client.end();
    return;
  }

  for (const file of pending) {
    const fullPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(fullPath, "utf8");
    console.log(`Applying: ${file} ...`);
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(`INSERT INTO tenant_schema_migrations (filename) VALUES ($1)`, [file]);
      await client.query("COMMIT");
      console.log(`  OK: ${file}`);
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      console.error(`  FAILED: ${file}`);
      console.error(err.message || err);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log("All pending tenant migrations applied successfully.");
}

main().catch((e) => {
  console.error(e);
  process.exit(10);
});

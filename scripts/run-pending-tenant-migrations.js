#!/usr/bin/env node
/**
 * Applies pending tenant SQL migrations from `prisma/tenant-migrations`.
 *
 * Per-tenant state is tracked inside each tenant DB via `tenant_schema_migrations`
 * (created on first run), so individual files are applied at most once.
 *
 * Modes:
 *   1) Single tenant (existing behavior):
 *      node scripts/run-pending-tenant-migrations.js --url "postgresql://..."
 *      node scripts/run-pending-tenant-migrations.js --slug stellixsoft
 *      node scripts/run-pending-tenant-migrations.js --id <org-uuid>
 *
 *   2) All tenants (deploy / CI):
 *      node scripts/run-pending-tenant-migrations.js --all
 *
 * Common flags:
 *   --dry-run                        Print what would run, do not execute
 *   --from <N>                       Skip files with numeric prefix < N
 *   --baseline <N>                   Mark files with prefix < N as applied (no SQL run)
 *   --concurrency <N>                For --all: tenants migrated in parallel (default 1)
 *   --statement-timeout-ms <N>       PG statement_timeout per tenant (default 600000 = 10m)
 *   --include-suspended              For --all: include suspended orgs (default skip)
 *   --include-blocked                For --all: include blocked orgs (default skip)
 *   --fail-fast                      For --all: stop at the first failing tenant
 *
 * Exit codes:
 *   0   success
 *   1   bad args / missing folder / migration failure (single tenant)
 *   2   org / tenant DB not found
 *   3   one or more tenants failed (--all)
 *  10   unexpected error
 */

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const { PrismaClient } = require("@prisma/client");
const { revealTenantConnectionString } = require("./lib/tenant-secrets");

const MIGRATIONS_DIR = path.join(process.cwd(), "prisma", "tenant-migrations");
const DEFAULT_STATEMENT_TIMEOUT_MS = 10 * 60 * 1000;
const CONNECT_TIMEOUT_MS = 15 * 1000;

function parseArgs(argv) {
  const out = {
    url: "",
    slug: "",
    id: "",
    all: false,
    dryRun: false,
    from: 0,
    baseline: 0,
    concurrency: 1,
    statementTimeoutMs: DEFAULT_STATEMENT_TIMEOUT_MS,
    includeSuspended: false,
    includeBlocked: false,
    failFast: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const t = argv[i];
    const next = argv[i + 1];
    if (t === "--url") out.url = next || "";
    else if (t === "--slug") out.slug = next || "";
    else if (t === "--id") out.id = next || "";
    else if (t === "--all") out.all = true;
    else if (t === "--dry-run") out.dryRun = true;
    else if (t === "--from") out.from = parseInt(next || "0", 10) || 0;
    else if (t === "--baseline") out.baseline = parseInt(next || "0", 10) || 0;
    else if (t === "--concurrency") out.concurrency = Math.max(1, parseInt(next || "1", 10) || 1);
    else if (t === "--statement-timeout-ms") {
      out.statementTimeoutMs = Math.max(1000, parseInt(next || `${DEFAULT_STATEMENT_TIMEOUT_MS}`, 10) || DEFAULT_STATEMENT_TIMEOUT_MS);
    } else if (t === "--include-suspended") out.includeSuspended = true;
    else if (t === "--include-blocked") out.includeBlocked = true;
    else if (t === "--fail-fast") out.failFast = true;
  }

  return out;
}

function timestamp() {
  return new Date().toISOString();
}

function log(label, msg) {
  const prefix = label ? `[${label}] ` : "";
  process.stdout.write(`${timestamp()} ${prefix}${msg}\n`);
}

function logError(label, msg) {
  const prefix = label ? `[${label}] ` : "";
  process.stderr.write(`${timestamp()} ${prefix}${msg}\n`);
}

/**
 * Mask credentials from a connection string for safe logging.
 * Returns "host:port/db" or "<redacted>" if it cannot be parsed.
 */
function safeDsnLabel(connectionString) {
  try {
    const u = new URL(connectionString);
    const host = u.hostname || "?";
    const port = u.port || "5432";
    const db = (u.pathname || "/").replace(/^\//, "") || "?";
    return `${host}:${port}/${db}`;
  } catch {
    return "<redacted>";
  }
}

function sslOption(connectionString) {
  if (/sslmode=disable/i.test(connectionString)) return false;
  if (/(?:^|@)(localhost|127\.0\.0\.1|\[::1\])(?::|\/)/i.test(connectionString)) return false;
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

function readMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    throw new Error(`Missing folder: ${MIGRATIONS_DIR}`);
  }
  return sortMigrationFiles(fs.readdirSync(MIGRATIONS_DIR));
}

async function resolveSingleTenantUrl(args, prisma) {
  if (args.url) return { url: args.url.trim(), label: "url" };
  if (!args.slug && !args.id) {
    throw new Error("Provide --url, --slug, --id, or --all.");
  }
  const where = args.slug ? { slug: args.slug } : { id: args.id };
  const org = await prisma.organization.findUnique({
    where,
    include: { database: true },
  });
  const url = org?.database?.connectionString?.trim() || "";
  if (!url) {
    const err = new Error("Organization or tenant connection string not found.");
    err.exitCode = 2;
    throw err;
  }
  return { url, label: org.slug || org.id };
}

async function loadAllTenants(args, prisma) {
  const orgs = await prisma.organization.findMany({
    include: { database: true },
    orderBy: { createdAt: "asc" },
  });

  const tenants = [];
  const skipped = [];

  for (const org of orgs) {
    const conn = org.database?.connectionString?.trim();
    if (!conn) {
      skipped.push({ label: org.slug || org.id, reason: "no tenant database" });
      continue;
    }
    if (!args.includeSuspended && org.status === "suspended") {
      skipped.push({ label: org.slug || org.id, reason: "status=suspended" });
      continue;
    }
    if (!args.includeBlocked && org.status === "blocked") {
      skipped.push({ label: org.slug || org.id, reason: "status=blocked" });
      continue;
    }
    tenants.push({
      orgId: org.id,
      label: org.slug || org.id,
      url: conn,
    });
  }

  return { tenants, skipped };
}

async function migrateOneTenant({
  label,
  url,
  allFiles,
  args,
}) {
  let connectionString;
  try {
    connectionString = revealTenantConnectionString(url);
  } catch (err) {
    throw new Error(
      `Failed to decrypt tenant connection string: ${err.message || err}`
    );
  }

  const dsnLabel = safeDsnLabel(connectionString);
  const client = new Client({
    connectionString,
    ssl: sslOption(connectionString),
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
    statement_timeout: args.statementTimeoutMs,
  });

  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenant_schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const appliedRes = await client.query(
      `SELECT filename FROM tenant_schema_migrations ORDER BY filename`
    );
    const applied = new Set(appliedRes.rows.map((r) => r.filename));

    if (args.baseline > 0 && !args.dryRun) {
      const toMark = allFiles.filter((f) => {
        const n = parseInt(f.match(/^(\d+)_/)?.[1] || "0", 10);
        return n < args.baseline && !applied.has(f);
      });
      for (const file of toMark) {
        await client.query(
          `INSERT INTO tenant_schema_migrations (filename) VALUES ($1)
           ON CONFLICT (filename) DO NOTHING`,
          [file]
        );
        applied.add(file);
      }
      if (toMark.length) {
        log(label, `baseline: marked ${toMark.length} migration(s) as applied (< ${args.baseline}) on ${dsnLabel}`);
      }
    }

    let pending = allFiles.filter((f) => !applied.has(f));
    if (args.from > 0) {
      pending = pending.filter((f) => {
        const n = parseInt(f.match(/^(\d+)_/)?.[1] || "0", 10);
        return n >= args.from;
      });
    }

    if (pending.length === 0) {
      log(label, `up to date on ${dsnLabel}`);
      return { label, dsnLabel, applied: 0, skipped: 0 };
    }

    log(label, `applying ${pending.length} migration(s) to ${dsnLabel}`);
    for (const f of pending) log(label, `  pending: ${f}`);

    if (args.dryRun) {
      log(label, `dry-run: not executing on ${dsnLabel}`);
      return { label, dsnLabel, applied: 0, skipped: pending.length, dryRun: true };
    }

    let appliedCount = 0;
    for (const file of pending) {
      const fullPath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(fullPath, "utf8");
      log(label, `applying ${file} ...`);
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query(
          `INSERT INTO tenant_schema_migrations (filename) VALUES ($1)`,
          [file]
        );
        await client.query("COMMIT");
        appliedCount += 1;
        log(label, `  OK ${file}`);
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw new Error(`Failed on ${file}: ${err.message || err}`);
      }
    }

    log(label, `done: ${appliedCount} migration(s) applied to ${dsnLabel}`);
    return { label, dsnLabel, applied: appliedCount, skipped: 0 };
  } finally {
    await client.end().catch(() => {});
  }
}

/**
 * Run an async worker pool over a list of items with limited concurrency.
 */
async function runPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const i = index;
      index += 1;
      if (i >= items.length) return;
      try {
        results[i] = { ok: true, value: await worker(items[i], i) };
      } catch (err) {
        results[i] = { ok: false, error: err, item: items[i] };
      }
    }
  });
  await Promise.all(workers);
  return results;
}

async function runAll(args, prisma, allFiles) {
  const { tenants, skipped } = await loadAllTenants(args, prisma);

  log("all", `discovered ${tenants.length} tenant(s); skipped ${skipped.length}`);
  for (const s of skipped) log("all", `  skip ${s.label}: ${s.reason}`);

  if (tenants.length === 0) {
    log("all", "no tenants to migrate");
    return { failures: [], successes: [] };
  }

  const failures = [];
  const successes = [];
  let stopRequested = false;

  const worker = async (tenant) => {
    if (stopRequested) {
      throw new Error("aborted: fail-fast triggered by earlier failure");
    }
    try {
      const res = await migrateOneTenant({
        label: tenant.label,
        url: tenant.url,
        allFiles,
        args,
      });
      successes.push(res);
      return res;
    } catch (err) {
      logError(tenant.label, `FAILED: ${err.message || err}`);
      failures.push({ label: tenant.label, error: err.message || String(err) });
      if (args.failFast) stopRequested = true;
      throw err;
    }
  };

  await runPool(tenants, args.concurrency, worker);

  return { failures, successes };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const allFiles = readMigrationFiles();

  const prisma = new PrismaClient();
  try {
    if (args.all) {
      const { failures, successes } = await runAll(args, prisma, allFiles);

      log("all", `summary: ${successes.length} succeeded, ${failures.length} failed`);
      for (const s of successes) {
        log("all", `  ok ${s.label} (applied=${s.applied}${s.dryRun ? ", dry-run" : ""})`);
      }
      for (const f of failures) {
        logError("all", `  fail ${f.label}: ${f.error}`);
      }

      if (failures.length > 0) {
        process.exit(3);
      }
      return;
    }

    const { url, label } = await resolveSingleTenantUrl(args, prisma);
    await migrateOneTenant({ label, url, allFiles, args });
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main().catch((e) => {
  logError("", e.stack || e.message || String(e));
  process.exit(typeof e.exitCode === "number" ? e.exitCode : 10);
});

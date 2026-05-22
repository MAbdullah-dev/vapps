import { Client } from "pg";
import crypto from "crypto";
import { getSSLConfig, getSSLModeForConnectionString } from "@/lib/db/ssl-config";

/**
 * Database creation result with connection details
 */
export interface TenantDatabaseResult {
  dbName: string;
  dbUser: string;
  dbPassword: string;
  dbHost: string;
  dbPort: number;
  connectionString: string;
}

/**
 * Creates a tenant database for an organization with a dedicated user
 * @param orgId - Organization UUID
 * @returns Database connection details
 */
export async function createTenantDatabase(orgId: string): Promise<TenantDatabaseResult> {
  const adminUrl = process.env.RDS_ADMIN_URL;
  if (!adminUrl) {
    throw new Error("RDS_ADMIN_URL is missing in environment variables");
  }

  // Parse admin URL to extract host and port
  const adminUrlObj = new URL(adminUrl);
  const dbHost = adminUrlObj.hostname;
  const dbPort = parseInt(adminUrlObj.port || "5432", 10);

  const client = new Client({
    connectionString: adminUrl,
    ssl: getSSLConfig(adminUrl),
  });

  try {
    await client.connect();

    // Generate safe database name (PostgreSQL identifiers)
    const dbName = `org_${orgId.replace(/-/g, "_")}`;
    
    // Generate secure credentials for tenant database
    const dbUser = `org_user_${orgId.replace(/-/g, "_")}`;
    const dbPassword = crypto.randomBytes(32).toString("hex");

    // Check if database already exists
    const dbExistsResult = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (dbExistsResult.rows.length > 0) {
      throw new Error(`Database ${dbName} already exists`);
    }

    // Create the database
    await client.query(`CREATE DATABASE "${dbName}";`);

    // Create a dedicated user for this tenant database
    // Note: PostgreSQL user creation requires superuser privileges
    // Note: CREATE USER doesn't support parameterized queries, so we use quote_literal for safety
    try {
      // Use PostgreSQL's quote_literal function to safely escape the password
      // This is safer than manual string escaping
      const passwordResult = await client.query(
        `SELECT quote_literal($1) as quoted_password`,
        [dbPassword]
      );
      const quotedPassword = passwordResult.rows[0].quoted_password;
      
      await client.query(
        `CREATE USER "${dbUser}" WITH PASSWORD ${quotedPassword};`
      );
    } catch (error: any) {
      // If user already exists, we'll handle it
      if (!error.message.includes("already exists") && !error.message.includes("duplicate")) {
        throw error;
      }
    }

    // Grant all privileges on the database to the user
    await client.query(`GRANT ALL PRIVILEGES ON DATABASE "${dbName}" TO "${dbUser}";`);

    // Connect to the new database to grant schema privileges
    const tenantClient = new Client({
      connectionString: adminUrl.replace(/\/[^/]+$/, `/${dbName}`),
      ssl: getSSLConfig(adminUrl),
    });

    try {
      await tenantClient.connect();
      
      // Grant privileges on the public schema
      await tenantClient.query(`GRANT ALL ON SCHEMA public TO "${dbUser}";`);
      await tenantClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "${dbUser}";`);
      await tenantClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "${dbUser}";`);
      
      await tenantClient.end();
    } catch (error) {
      // If we can't grant schema privileges, log but don't fail
      console.warn(`Warning: Could not grant schema privileges: ${error}`);
    }

    // Construct connection string; sslmode derived from host (local vs AWS)
    const sslmode = getSSLModeForConnectionString(dbHost);
    const connectionString = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?schema=public&sslmode=${sslmode}`;

    return {
      dbName,
      dbUser,
      dbPassword,
      dbHost,
      dbPort,
      connectionString,
    };
  } catch (error: any) {
    console.error("Error creating tenant database:", error);
    throw new Error(`Failed to create tenant database: ${error.message}`);
  } finally {
    await client.end();
  }
}

function sortTenantMigrationFiles(files: string[]): string[] {
  return files
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => {
      const numA = parseInt(a.match(/^(\d+)_/)?.[1] || "0", 10);
      const numB = parseInt(b.match(/^(\d+)_/)?.[1] || "0", 10);
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });
}

/**
 * Helper to run tenant migrations programmatically.
 * Uses `tenant_schema_migrations` (same as scripts/run-pending-tenant-migrations.js)
 * so each SQL file is applied at most once per tenant DB.
 */
export async function runTenantMigrations(connectionString: string): Promise<boolean> {
  const fs = require("fs");
  const path = require("path");

  const client = new Client({
    connectionString,
    ssl: getSSLConfig(connectionString),
  });

  try {
    await client.connect();

    const migrationsDir = path.join(process.cwd(), "prisma", "tenant-migrations");
    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations directory not found: ${migrationsDir}`);
    }

    const migrationFiles = sortTenantMigrationFiles(fs.readdirSync(migrationsDir));

    await client.query(`
      CREATE TABLE IF NOT EXISTS tenant_schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const appliedRes = await client.query(
      `SELECT filename FROM tenant_schema_migrations ORDER BY filename`
    );
    const applied = new Set<string>(
      appliedRes.rows.map((r: { filename: string }) => r.filename)
    );

    const pending = migrationFiles.filter((f) => !applied.has(f));
    if (pending.length === 0) {
      console.log("Tenant migrations: already up to date");
      return true;
    }

    console.log(`Running ${pending.length} pending tenant migration(s)...`);

    for (const file of pending) {
      const migrationPath = path.join(migrationsDir, file);
      const migrationSQL = fs.readFileSync(migrationPath, "utf-8");
      console.log(`Running migration: ${file}`);
      try {
        await client.query("BEGIN");
        await client.query(migrationSQL);
        await client.query(
          `INSERT INTO tenant_schema_migrations (filename) VALUES ($1)`,
          [file]
        );
        await client.query("COMMIT");
        console.log(`✓ Completed migration: ${file}`);
      } catch (err: unknown) {
        await client.query("ROLLBACK").catch(() => {});
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed on ${file}: ${message}`);
      }
    }

    console.log("✓ All pending tenant migrations completed successfully");
    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error running tenant migrations:", message);
    throw new Error(`Failed to run tenant migrations: ${message}`);
  } finally {
    await client.end().catch(() => {});
  }
}

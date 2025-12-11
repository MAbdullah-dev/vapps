import { Client } from "pg";
import crypto from "crypto";

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
    ssl: {
      rejectUnauthorized: false, // Required for AWS RDS
    },
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
      ssl: {
        rejectUnauthorized: false,
      },
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

    // Construct connection string
    const connectionString = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?schema=public&sslmode=require`;

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

/**
 * Helper to run tenant migrations programmatically
 * @param connectionString - Tenant database connection string
 * @returns Success status
 */
export async function runTenantMigrations(connectionString: string): Promise<boolean> {
  const fs = require("fs");
  const path = require("path");
  
  try {
    const client = new Client({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    await client.connect();

    // Read the migration SQL file
    const migrationPath = path.join(
      process.cwd(),
      "prisma",
      "tenant-migrations",
      "001_initial_tenant_schema.sql"
    );

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

    // Execute the migration
    await client.query(migrationSQL);

    await client.end();

    return true;
  } catch (error: any) {
    console.error("Error running tenant migrations:", error);
    throw new Error(`Failed to run tenant migrations: ${error.message}`);
  }
}

import { Client } from "pg";
import crypto from "crypto";

export async function createTenantDatabase(orgId: string) {
  const adminUrl = process.env.RDS_ADMIN_URL;
  if (!adminUrl) throw new Error("RDS_ADMIN_URL missing in env");

  const client = new Client({
    connectionString: adminUrl,
  });

  await client.connect();

  // generate safe DB name
  const dbName = `org_${orgId.replace(/-/g, "_")}`;

  // create DB
  await client.query(`CREATE DATABASE "${dbName}";`);

  await client.end();

  // You may want to provision a DB user and password for this tenant and run migrations here
  // For now return DB name and let caller construct connection string
  return dbName;
}

// helper to run tenant migrations programmatically (example uses shell command)
export async function runTenantMigrations(connectionString: string) {
  // You can spawn `npx prisma migrate deploy` with prisma.config or set DATABASE_URL env.
  // Keep simple: return connectionString and run migrations manually or via CI/CD.
  return true;
}

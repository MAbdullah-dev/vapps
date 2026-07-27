import { Client } from "pg";
import { prisma } from "@/lib/prisma";
import { getSSLConfig } from "@/lib/db/ssl-config";
import { revealTenantConnectionString } from "@/lib/tenant-secrets";

/**
 * Get a PostgreSQL client connected to a tenant database
 * @param orgId - Organization ID
 * @returns Connected PostgreSQL client
 */
export async function getTenantClient(orgId: string): Promise<Client> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: { database: true },
  });

  if (!org || !org.database) {
    throw new Error(`Tenant database not found for organization ${orgId}`);
  }

  const connectionString = revealTenantConnectionString(
    org.database.connectionString
  );

  const client = new Client({
    connectionString,
    ssl: getSSLConfig(connectionString),
  });

  await client.connect();
  return client;
}

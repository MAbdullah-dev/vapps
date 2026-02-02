import { Client } from "pg";
import { getSSLConfig } from "@/lib/db/ssl-config";

/**
 * Safely execute a function with a database connection, ensuring it's always closed
 * @param connectionString - Database connection string
 * @param fn - Function to execute with the connected client
 * @returns Result of the function
 */
export async function withTenantConnection<T>(
  connectionString: string,
  fn: (client: Client) => Promise<T>
): Promise<T> {
  const client = new Client({
    connectionString,
    ssl: getSSLConfig(connectionString),
  });

  try {
    await client.connect();
    return await fn(client);
  } finally {
    await client.end().catch((err) => {
      console.error("Error closing database connection:", err);
    });
  }
}


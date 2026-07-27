import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-access";
import { Pool } from "pg";
import { getSSLConfig } from "@/lib/db/ssl-config";

/**
 * Super-admin-only database connectivity check.
 * GET /api/test-db-connection
 * Disabled entirely outside development unless the caller is a platform super admin.
 */
export async function GET(req: NextRequest) {
  const admin = await getAdminUser(req);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const start = Date.now();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return NextResponse.json(
      { success: false, error: "DATABASE_URL is not configured" },
      { status: 500 }
    );
  }

  try {
    const testPool = new Pool({
      connectionString,
      ssl: getSSLConfig(connectionString),
      max: 1,
      connectionTimeoutMillis: 10000,
    });

    const client = await testPool.connect();

    try {
      const queryStart = Date.now();
      const result = await client.query("SELECT 1 as test, NOW() as current_time");
      const queryTime = Date.now() - queryStart;
      const totalTime = Date.now() - start;

      await client.release();
      await testPool.end();

      return NextResponse.json({
        success: true,
        connectionTime: totalTime,
        queryTime,
        result: result.rows[0],
        message:
          queryTime > 5000
            ? `Database is slow (${queryTime}ms).`
            : `Database connection is healthy (${queryTime}ms)`,
      });
    } catch (queryError) {
      await client.release();
      await testPool.end();
      throw queryError;
    }
  } catch (error: unknown) {
    const totalTime = Date.now() - start;
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        success: false,
        connectionTime: totalTime,
        error: message,
        message: `Database connection failed after ${totalTime}ms`,
      },
      { status: 500 }
    );
  }
}

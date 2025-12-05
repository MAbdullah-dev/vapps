import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-server-session";
import { prisma } from "@/lib/prisma";
import { Client } from "pg";

/**
 * GET /api/organization/[orgId]/tenant-info
 * Get information about a tenant database including tables and basic stats
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get organization and verify user has access
    const org = await prisma.organization.findUnique({
      where: { id: params.orgId },
      include: { 
        database: true,
        users: {
          where: { userId: user.id },
        },
      },
    });

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Check if user has access to this organization
    const hasAccess = org.ownerId === user.id || org.users.length > 0;
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    if (!org.database) {
      return NextResponse.json(
        { error: "Tenant database not found for this organization" },
        { status: 404 }
      );
    }

    // Connect to tenant database
    const client = new Client({
      connectionString: org.database.connectionString,
      ssl: { rejectUnauthorized: false },
    });

    try {
      await client.connect();

      // Get database information
      const [tablesResult, dbSizeResult, connectionCountResult] = await Promise.all([
        // List all tables
        client.query(`
          SELECT 
            table_name,
            table_type
          FROM information_schema.tables 
          WHERE table_schema = 'public'
          ORDER BY table_name
        `),
        
        // Get database size
        client.query(`
          SELECT pg_size_pretty(pg_database_size($1)) as size
        `, [org.database.dbName]),
        
        // Get connection count
        client.query(`
          SELECT count(*) as connections
          FROM pg_stat_activity 
          WHERE datname = $1
        `, [org.database.dbName]),
      ]);

      // Get row counts for each table
      const tableCounts = await Promise.all(
        tablesResult.rows.map(async (table: any) => {
          try {
            const countResult = await client.query(
              `SELECT COUNT(*) as count FROM "${table.table_name}"`
            );
            return {
              ...table,
              rowCount: parseInt(countResult.rows[0].count),
            };
          } catch {
            return {
              ...table,
              rowCount: 0,
            };
          }
        })
      );

      await client.end();

      return NextResponse.json({
        organization: {
          id: org.id,
          name: org.name,
          createdAt: org.createdAt,
        },
        database: {
          name: org.database.dbName,
          host: org.database.dbHost,
          port: org.database.dbPort,
          user: org.database.dbUser,
          size: dbSizeResult.rows[0]?.size || "0 bytes",
          activeConnections: parseInt(connectionCountResult.rows[0]?.connections || "0"),
        },
        tables: tableCounts,
        connectionString: org.database.connectionString, // For reference, but be careful in production
      });
    } catch (dbError: any) {
      await client.end();
      return NextResponse.json(
        {
          error: "Failed to connect to tenant database",
          message: dbError.message,
          database: {
            name: org.database.dbName,
            host: org.database.dbHost,
            port: org.database.dbPort,
          },
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error getting tenant info:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

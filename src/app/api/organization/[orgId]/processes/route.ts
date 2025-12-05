import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-server-session";
import { prisma } from "@/lib/prisma";
import { Client } from "pg";

/**
 * GET /api/organization/[orgId]/processes?siteId=xxx
 * Get all processes for an organization, optionally filtered by siteId
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = await params;
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId");

    // Get organization and verify user has access
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
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

    // Check if user has access
    const hasAccess = org.ownerId === user.id || org.users.length > 0;
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!org.database) {
      return NextResponse.json(
        { error: "Tenant database not found" },
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

      // Get processes, optionally filtered by siteId
      let processesQuery = `
        SELECT 
          p.id,
          p.name,
          p."siteId",
          p."createdAt",
          p."updatedAt",
          s.name as "siteName",
          s.code as "siteCode",
          s.location as "siteLocation"
        FROM processes p
        INNER JOIN sites s ON p."siteId" = s.id
      `;

      const queryParams: string[] = [];
      if (siteId) {
        processesQuery += ` WHERE p."siteId" = $1`;
        queryParams.push(siteId);
      }

      processesQuery += ` ORDER BY p."createdAt" DESC`;

      const processesResult = await client.query(
        processesQuery,
        queryParams.length > 0 ? queryParams : undefined
      );

      await client.end();

      return NextResponse.json({
        processes: processesResult.rows,
      });
    } catch (dbError: any) {
      await client.end();
      return NextResponse.json(
        { error: "Failed to fetch processes", message: dbError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error fetching processes:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

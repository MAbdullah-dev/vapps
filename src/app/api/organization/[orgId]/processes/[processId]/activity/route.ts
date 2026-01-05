import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { getTenantClient } from "@/lib/db/tenant-pool";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * GET /api/organization/[orgId]/processes/[processId]/activity
 * Get activity log for a process
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; processId: string }> }
) {
  try {
    const { orgId, processId } = await params;
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Get request context (user + tenant) - single call, cached
    const ctx = await getRequestContext(req, orgId);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use tenant pool instead of new Client()
    const client = await getTenantClient(orgId);

    try {
      // Verify process exists
      const processResult = await client.query(
        `SELECT id FROM processes WHERE id = $1`,
        [processId]
      );

      if (processResult.rows.length === 0) {
        client.release();
        return NextResponse.json(
          { error: "Process not found" },
          { status: 404 }
        );
      }

      // Get activity log entries, ordered by most recent first
      const activityResult = await client.query(
        `SELECT 
          id,
          "processId",
          "userId",
          "userName",
          "userEmail",
          action,
          "entityType",
          "entityId",
          "entityTitle",
          details,
          "createdAt"
        FROM activity_log
        WHERE "processId" = $1
        ORDER BY "createdAt" DESC
        LIMIT $2`,
        [processId, limit]
      );

      client.release();

      return NextResponse.json({
        activities: activityResult.rows,
      });
    } catch (dbError: any) {
      client.release();
      return NextResponse.json(
        { error: "Failed to fetch activity log", message: dbError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error fetching activity log:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organization/[orgId]/processes/[processId]/activity
 * Log an activity
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; processId: string }> }
) {
  try {
    const { orgId, processId } = await params;
    const body = await req.json();
    const { action, entityType, entityId, entityTitle, details } = body;

    // Get request context (user + tenant) - single call, cached
    const ctx = await getRequestContext(req, orgId);
    if (!ctx || !ctx.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use tenant pool instead of new Client()
    const client = await getTenantClient(orgId);

    try {
      // Get user details for caching
      const user = await prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { id: true, name: true, email: true },
      });

      if (!user) {
        client.release();
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      // Verify process exists
      const processResult = await client.query(
        `SELECT id FROM processes WHERE id = $1`,
        [processId]
      );

      if (processResult.rows.length === 0) {
        client.release();
        return NextResponse.json(
          { error: "Process not found" },
          { status: 404 }
        );
      }

      // Insert activity log entry
      const activityId = crypto.randomUUID();
      await client.query(
        `INSERT INTO activity_log (
          id,
          "processId",
          "userId",
          "userName",
          "userEmail",
          action,
          "entityType",
          "entityId",
          "entityTitle",
          details
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          activityId,
          processId,
          user.id,
          user.name || user.email || "Unknown",
          user.email || null,
          action,
          entityType,
          entityId || null,
          entityTitle || null,
          JSON.stringify(details || {}),
        ]
      );

      client.release();

      return NextResponse.json({
        message: "Activity logged successfully",
        activityId,
      });
    } catch (dbError: any) {
      client.release();
      return NextResponse.json(
        { error: "Failed to log activity", message: dbError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error logging activity:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

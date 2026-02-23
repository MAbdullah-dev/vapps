import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { getTenantClient } from "@/lib/db/tenant-pool";
import { prisma } from "@/lib/prisma";
import { roleToLeadershipTier } from "@/lib/roles";

/**
 * GET /api/organization/[orgId]/notifications
 * Returns recent activity for the current user across all processes they can access.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10), 50);

    const ctx = await getRequestContext(req, orgId);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { ownerId: true },
    });
    const userOrg = await prisma.userOrganization.findUnique({
      where: {
        userId_organizationId: { userId: ctx.user.id, organizationId: orgId },
      },
      select: { role: true, leadershipTier: true },
    });
    const isOwner = org?.ownerId === ctx.user.id;
    const userRole = isOwner ? "owner" : (userOrg?.role || "member");
    const leadershipTier = userOrg?.leadershipTier || roleToLeadershipTier(userRole);
    const isTopLeadership = leadershipTier === "Top" || isOwner;
    const isOperationalLeadership = leadershipTier === "Operational";
    const isSupportLeadership = leadershipTier === "Support";

    const client = await getTenantClient(orgId);

    try {
      let allowedProcessIds: string[] = [];

      if (isTopLeadership) {
        const result = await client.query<{ id: string }>(
          `SELECT id FROM processes`
        );
        allowedProcessIds = result.rows.map((r) => r.id);
      } else if (isOperationalLeadership) {
        const siteRows = await client.query<{ site_id: string }>(
          `SELECT site_id::text as site_id FROM site_users WHERE user_id = $1`,
          [ctx.user.id]
        );
        const siteIds = siteRows.rows.map((r) => r.site_id);
        if (siteIds.length > 0) {
          const placeholders = siteIds.map((_, i) => `$${i + 1}`).join(", ");
          const processResult = await client.query<{ id: string }>(
            `SELECT id FROM processes WHERE "siteId"::text IN (${placeholders})`,
            siteIds
          );
          allowedProcessIds = processResult.rows.map((r) => r.id);
        }
      } else if (isSupportLeadership) {
        const processRows = await client.query<{ process_id: string }>(
          `SELECT process_id::text as process_id FROM process_users WHERE user_id = $1`,
          [ctx.user.id]
        );
        allowedProcessIds = processRows.rows.map((r) => r.process_id);
      }

      if (allowedProcessIds.length === 0) {
        return NextResponse.json({ activities: [], dismissedIds: [] });
      }

      const placeholders = allowedProcessIds.map((_, i) => `$${i + 1}`).join(", ");
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
        WHERE "processId" IN (${placeholders})
        ORDER BY "createdAt" DESC
        LIMIT $${allowedProcessIds.length + 1}`,
        [...allowedProcessIds, limit]
      );

      const activityIds = activityResult.rows.map((r: { id: string }) => r.id);
      const dismissals = await prisma.userNotificationDismissal.findMany({
        where: {
          userId: ctx.user.id,
          organizationId: orgId,
          activityId: { in: activityIds },
        },
        select: { activityId: true },
      });
      const dismissedIds = dismissals.map((d) => d.activityId);

      return NextResponse.json({
        activities: activityResult.rows,
        dismissedIds,
      });
    } catch (dbError: unknown) {
      const message = dbError instanceof Error ? dbError.message : "Unknown error";
      return NextResponse.json(
        { error: "Failed to fetch notifications", message },
        { status: 500 }
      );
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Internal server error", message },
      { status: 500 }
    );
  }
}

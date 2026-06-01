import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { getTenantClient } from "@/lib/db/tenant-pool";
import { prisma } from "@/lib/prisma";
import { fetchUserNotificationFeed } from "@/lib/fetch-user-notification-feed";

/**
 * GET /api/organization/[orgId]/notifications
 *
 * NOTIFICATION FLOW – When and what is shown
 * ------------------------------------------
 * 1. AUTH
 *    - User must be logged in and a member of the organization (orgId).
 *
 * 2. USER-SCOPED ACTIVITY (same sources as dashboard, filtered by stakeholder)
 *    - Issues: assignee, issuer, verifier (not all process members).
 *    - Documents: creator, process owner (reviewer), approver per workflow action.
 *    - Audits: lead auditor, assigned auditors, auditee per status transition.
 *    - Sprints / other process events: users assigned to that process.
 *    - The actor who performed an action is not notified for their own event.
 *
 * 3. DISMISSALS
 *    - UserNotificationDismissal (main DB) stores which activity IDs the user
 *      has dismissed. Those are returned as dismissedIds; client hides them.
 *      Synthetic ids: audit-{planId}, doc-{historyRowId}.
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
    const resolvedOrgId = ctx.tenant.orgId;

    const client = await getTenantClient(resolvedOrgId);

    try {
      const activities = await fetchUserNotificationFeed(client, ctx.user.id, limit);
      const activityIds = activities.map((a) => a.id);

      const dismissals = await prisma.userNotificationDismissal.findMany({
        where: {
          userId: ctx.user.id,
          organizationId: resolvedOrgId,
          activityId: { in: activityIds },
        },
        select: { activityId: true },
      });
      type DismissalRow = (typeof dismissals)[number];
      const dismissedIds = dismissals.map((d: DismissalRow) => d.activityId);

      return NextResponse.json({
        activities,
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

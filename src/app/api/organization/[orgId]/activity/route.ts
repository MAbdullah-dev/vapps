import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { getTenantClient } from "@/lib/db/tenant-pool";
import { fetchOrgWideActivityFeed } from "@/lib/fetch-org-wide-activity-feed";

/**
 * GET /api/organization/[orgId]/activity
 *
 * Returns recent activity for the **whole organization**.
 * Visible to every member of the org (no filtering by process/site access).
 * Used by the dashboard "Recent Activity" card.
 *
 * Sources: activity_log (all processes), audit_plans, document_module_history.
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

    const client = await getTenantClient(ctx.tenant.orgId);

    try {
      const activities = await fetchOrgWideActivityFeed(client, limit);
      return NextResponse.json({ activities });
    } catch (dbError: unknown) {
      const message = dbError instanceof Error ? dbError.message : "Unknown error";
      return NextResponse.json(
        { error: "Failed to fetch activity", message },
        { status: 500 }
      );
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching organization activity:", error);
    return NextResponse.json(
      { error: "Internal server error", message },
      { status: 500 }
    );
  }
}

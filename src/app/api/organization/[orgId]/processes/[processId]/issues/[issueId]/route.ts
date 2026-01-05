import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { queryTenant, getTenantClient } from "@/lib/db/tenant-pool";
import { cache, cacheKeys } from "@/lib/cache";
import { logActivity } from "@/lib/activity-logger";

/**
 * GET /api/organization/[orgId]/processes/[processId]/issues/[issueId]
 * Get a single issue by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; processId: string; issueId: string }> }
) {
  try {
    const { orgId, processId, issueId } = await params;

    // Get request context (user + tenant) - single call, cached
    const ctx = await getRequestContext(req, orgId);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check cache first (60s TTL)
    const cacheKey = cacheKeys.orgIssue(orgId, processId, issueId);
    const cachedIssue = cache.get<any>(cacheKey);
    if (cachedIssue) {
      return NextResponse.json(
        { issue: cachedIssue },
        { status: 200 }
      );
    }

    // Fetch the issue using tenant pool (much faster than new Client())
    const issues = await queryTenant(
      orgId,
      `SELECT 
        i.id,
        i.title,
        i.description,
        i.priority,
        i.status,
        i.points,
        i.assignee,
        i.tags,
        i.source,
        i."sprintId",
        i."processId",
        i."order",
        i."createdAt",
        i."updatedAt"
      FROM issues i
      WHERE i.id = $1 AND i."processId" = $2`,
      [issueId, processId]
    );

    if (issues.length === 0) {
      return NextResponse.json(
        { error: "Issue not found" },
        { status: 404 }
      );
    }

    const issue = issues[0];
    
    // Cache the issue for 60 seconds
    cache.set(cacheKey, issue, 60 * 1000);

    return NextResponse.json(
      {
        issue,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching issue:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/organization/[orgId]/processes/[processId]/issues/[issueId]
 * Update an issue
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; processId: string; issueId: string }> }
) {
  try {
    const { orgId, processId, issueId } = await params;
    
    // Get request context (user + tenant) - single call, cached
    const ctx = await getRequestContext(req, orgId);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Invalidate cache for this issue when updating
    const cacheKey = cacheKeys.orgIssue(orgId, processId, issueId);
    cache.delete(cacheKey);
    
    const body = await req.json();
    const { title, description, priority, status, points, assignee, tags, sprintId, order } = body;

    // Use tenant pool instead of new Client() for better performance
    const client = await getTenantClient(orgId);

    try {

      // Verify issue exists and belongs to this process
      const issueResult = await client.query(
        `SELECT id FROM issues WHERE id = $1 AND "processId" = $2`,
        [issueId, processId]
      );

      if (issueResult.rows.length === 0) {
        client.release();
        return NextResponse.json(
          { error: "Issue not found" },
          { status: 404 }
        );
      }

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Handle sprint assignment rules first
      if (sprintId !== undefined) {
        if (sprintId !== null) {
          // Verify sprint exists and belongs to this process
          const sprintResult = await client.query(
            `SELECT id FROM sprints WHERE id = $1 AND "processId" = $2`,
            [sprintId, processId]
          );

          if (sprintResult.rows.length === 0) {
            client.release();
            return NextResponse.json(
              { error: "Sprint not found or doesn't belong to this process" },
              { status: 404 }
            );
          }

          // Rule: If sprint is assigned, status must be "in-progress"
          updates.push(`"sprintId" = $${paramIndex++}`);
          values.push(sprintId);
          updates.push(`status = $${paramIndex++}`);
          values.push("in-progress");
        } else {
          // Rule: If sprintId is set to null, status should be "to-do" (backlog)
          updates.push(`"sprintId" = $${paramIndex++}`);
          values.push(null);
          updates.push(`status = $${paramIndex++}`);
          values.push("to-do");
        }
      }

      if (title !== undefined) {
        updates.push(`title = $${paramIndex++}`);
        values.push(title.trim());
      }
      if (description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(description?.trim() || null);
      }
      if (priority !== undefined) {
        updates.push(`priority = $${paramIndex++}`);
        values.push(priority);
      }
      if (points !== undefined) {
        updates.push(`points = $${paramIndex++}`);
        values.push(points);
      }
      if (assignee !== undefined) {
        updates.push(`assignee = $${paramIndex++}`);
        values.push(assignee || null);
      }
      if (tags !== undefined) {
        updates.push(`tags = $${paramIndex++}`);
        values.push(tags || []);
      }

      // Status is handled above based on sprintId rules
      // Only set status if sprintId wasn't provided (so status can be updated independently)
      if (status !== undefined && sprintId === undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(status);
      }
      if (order !== undefined) {
        updates.push(`"order" = $${paramIndex++}`);
        values.push(order);
      }

      if (updates.length === 0) {
        client.release();
        return NextResponse.json(
          { error: "No fields to update" },
          { status: 400 }
        );
      }

      updates.push(`"updatedAt" = NOW()`);
      values.push(issueId, processId);

      await client.query(
        `UPDATE issues 
         SET ${updates.join(", ")}
         WHERE id = $${paramIndex++} AND "processId" = $${paramIndex++}`,
        values
      );

      // Fetch the updated issue
      const updatedIssueResult = await client.query(
        `SELECT 
          i.id,
          i.title,
          i.description,
          i.priority,
          i.status,
          i.points,
          i.assignee,
          i.tags,
          i.source,
          i."sprintId",
          i."processId",
          i."order",
          i."createdAt",
          i."updatedAt"
        FROM issues i
        WHERE i.id = $1`,
        [issueId]
      );

      const updatedIssue = updatedIssueResult.rows[0];
      
      // Invalidate cache for this issue and related caches
      cache.delete(cacheKey);
      cache.clearPattern(`org:${orgId}:processes:*`); // Invalidate process issues list cache
      
      client.release();

      // Log activity (non-blocking)
      if (ctx.user?.id) {
        const activityDetails: Record<string, any> = {};
        
        // Track what changed
        if (status !== undefined) {
          activityDetails.newStatus = status;
          activityDetails.previousStatus = body.previousStatus || "unknown";
        }
        if (assignee !== undefined) {
          activityDetails.assignee = assignee;
        }
        if (sprintId !== undefined) {
          activityDetails.sprintId = sprintId;
        }

        const action = status !== undefined && body.previousStatus && status !== body.previousStatus
          ? "issue.status_changed"
          : assignee !== undefined
          ? "issue.assigned"
          : "issue.updated";

        logActivity(orgId, processId, ctx.user.id, {
          action,
          entityType: "issue",
          entityId: updatedIssue.id,
          entityTitle: updatedIssue.title,
          details: activityDetails,
        }).catch((err) => console.error("[Issue Update] Failed to log activity:", err));
      }

      return NextResponse.json(
        {
          message: "Issue updated successfully",
          issue: updatedIssue,
        },
        { status: 200 }
      );
    } catch (dbError: any) {
      client.release();
      return NextResponse.json(
        { error: "Failed to update issue", message: dbError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error updating issue:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organization/[orgId]/processes/[processId]/issues/[issueId]
 * Delete an issue
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; processId: string; issueId: string }> }
) {
  try {
    const { orgId, processId, issueId } = await params;

    // Get request context (user + tenant) - single call, cached
    const ctx = await getRequestContext(req, orgId);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use tenant pool instead of new Client()
    const client = await getTenantClient(orgId);

    try {

      // Verify issue exists and belongs to this process
      const issueResult = await client.query(
        `SELECT id FROM issues WHERE id = $1 AND "processId" = $2`,
        [issueId, processId]
      );

      if (issueResult.rows.length === 0) {
        client.release();
        return NextResponse.json(
          { error: "Issue not found" },
          { status: 404 }
        );
      }

      // Delete issue
      await client.query(
        `DELETE FROM issues WHERE id = $1`,
        [issueId]
      );
      
      // Invalidate related caches
      cache.clearPattern(`org:${orgId}:processes:*`); // Invalidate process issues list cache

      client.release();

      return NextResponse.json(
        {
          message: "Issue deleted successfully",
        },
        { status: 200 }
      );
    } catch (dbError: any) {
      client.release();
      return NextResponse.json(
        { error: "Failed to delete issue", message: dbError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error deleting issue:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

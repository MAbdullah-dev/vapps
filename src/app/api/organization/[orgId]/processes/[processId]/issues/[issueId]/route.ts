import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { queryTenant, getTenantClient } from "@/lib/db/tenant-pool";
import { cache, cacheKeys } from "@/lib/cache";
import { logActivity } from "@/lib/activity-logger";
import { prisma } from "@/lib/prisma";
import { roleToLeadershipTier } from "@/lib/roles";
import {
  PROCESS_ACCESS_DENIED_MESSAGE,
  resolveOrgOwner,
  userHasProcessAccess,
} from "@/lib/process-access";
import { ensureIssueCommentsColumn } from "@/lib/tenant-issues-schema";
import {
  isIssueCommentsOnlyPatch,
  isIssueStatusOnlyPatch,
  isSameIssueUser,
  issuePatchIncludesAssigneeForbiddenFields,
  validateBoardIssueStatusTransition,
} from "@/lib/issue-comment-permissions";
import { normalizeIssueCommentsOnRow } from "@/lib/issue-comments-normalize";

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
    const resolvedOrgId = ctx.tenant.orgId;

    const accessClient = await getTenantClient(resolvedOrgId);
    try {
      const processResult = await accessClient.query(
        `SELECT id, "siteId" FROM processes WHERE id = $1`,
        [processId]
      );
      if (processResult.rows.length === 0) {
        accessClient.release();
        return NextResponse.json({ error: "Process not found" }, { status: 404 });
      }
      const isOwner = await resolveOrgOwner(resolvedOrgId, ctx.user.id);
      const hasAccess = await userHasProcessAccess(
        accessClient,
        ctx.user.id,
        processId,
        isOwner
      );
      if (!hasAccess) {
        accessClient.release();
        return NextResponse.json({ error: PROCESS_ACCESS_DENIED_MESSAGE }, { status: 403 });
      }
      accessClient.release();
    } catch (e) {
      accessClient.release();
      throw e;
    }

    const cacheKey = cacheKeys.orgIssue(resolvedOrgId, processId, issueId);
    const cachedIssue = cache.get<any>(cacheKey);
    if (cachedIssue) {
      normalizeIssueCommentsOnRow(cachedIssue as Record<string, unknown>);
      return NextResponse.json(
        { issue: cachedIssue },
        { status: 200 }
      );
    }

    const ensureClient = await getTenantClient(resolvedOrgId);
    try {
      await ensureIssueCommentsColumn(ensureClient);
    } finally {
      ensureClient.release();
    }

    // Fetch the issue using tenant pool (much faster than new Client())
    let issues: any[];
    try {
      issues = await queryTenant(
        resolvedOrgId,
        `SELECT 
          i.id,
          i.title,
          i.description,
          i.priority,
          i.status,
          i.points,
          i.assignee,
          i.issuer,
          i.tags,
          i.source,
          i."sprintId",
          i."processId",
          i."order",
          i."createdAt",
          i."updatedAt",
          i."deadline",
          i."comments"
        FROM issues i
        WHERE i.id = $1 AND i."processId" = $2`,
        [issueId, processId]
      );
    } catch (queryErr: any) {
      if (queryErr?.code === "42703" || (queryErr?.message && String(queryErr.message).includes("deadline")) || (queryErr?.message && String(queryErr.message).includes("issuer"))) {
        issues = await queryTenant(
          resolvedOrgId,
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
        if (issues[0]) {
          if (!issues[0].deadline) issues[0].deadline = null;
          if (!issues[0].issuer) issues[0].issuer = null;
          normalizeIssueCommentsOnRow(issues[0] as Record<string, unknown>);
        }
      } else {
        throw queryErr;
      }
    }

    if (issues.length === 0) {
      return NextResponse.json(
        { error: "Issue not found" },
        { status: 404 }
      );
    }

    const issue = issues[0];
    // Normalize issuer to string so client comparison with session user id is reliable
    if (issue) {
      issue.issuer = issue.issuer != null ? String(issue.issuer) : null;
      normalizeIssueCommentsOnRow(issue as Record<string, unknown>);
    }

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
    const resolvedOrgId = ctx.tenant.orgId;

    const cacheKey = cacheKeys.orgIssue(resolvedOrgId, processId, issueId);
    cache.delete(cacheKey);

    const body = await req.json();
    const commentsOnly = isIssueCommentsOnlyPatch(body as Record<string, unknown>);
    const { title, description, priority, status, points, assignee, tags, sprintId, order, deadline, comments } = body;

    const client = await getTenantClient(resolvedOrgId);

    try {

      await ensureIssueCommentsColumn(client);

      const issueResult = await client.query(
        `SELECT id, assignee, issuer, status FROM issues WHERE id = $1 AND "processId" = $2`,
        [issueId, processId]
      );

      if (issueResult.rows.length === 0) {
        client.release();
        return NextResponse.json(
          { error: "Issue not found" },
          { status: 404 }
        );
      }

      const issueRow = issueResult.rows[0];
      const issueAssignee = issueRow.assignee;
      const issueIssuerRaw = issueRow.issuer;
      const uid = String(ctx.user.id);
      const isAssignee = isSameIssueUser(issueAssignee as string | null, uid);
      const isIssuer = isSameIssueUser(issueIssuerRaw as string | null, uid);
      const currentStatus = String(issueRow.status ?? "to-do");
      const role = { isAssignee, isIssuer };

      const processRow = await client.query(
        `SELECT "siteId" FROM processes WHERE id = $1`,
        [processId]
      );
      if (processRow.rows.length === 0) {
        client.release();
        return NextResponse.json({ error: "Process not found" }, { status: 404 });
      }
      const isOwner = await resolveOrgOwner(resolvedOrgId, ctx.user.id);
      const hasAccess = await userHasProcessAccess(
        client,
        ctx.user.id,
        processId,
        isOwner
      );
      if (!hasAccess) {
        client.release();
        return NextResponse.json({ error: PROCESS_ACCESS_DENIED_MESSAGE }, { status: 403 });
      }

      if (commentsOnly) {
        if (!isAssignee && !isIssuer) {
          client.release();
          return NextResponse.json(
            { error: "Only the assignee or issue creator can add comments." },
            { status: 403 }
          );
        }
      } else if (isIssueStatusOnlyPatch(body as Record<string, unknown>)) {
        if (!isAssignee && !isIssuer) {
          client.release();
          return NextResponse.json(
            { error: "Only the assignee or issue creator can update this issue." },
            { status: 403 }
          );
        }
        if (status !== undefined) {
          const transitionError = validateBoardIssueStatusTransition(
            currentStatus,
            String(status),
            role
          );
          if (transitionError) {
            client.release();
            return NextResponse.json({ error: transitionError }, { status: 403 });
          }
        }
      } else if (isAssignee && !isIssuer) {
        if (issuePatchIncludesAssigneeForbiddenFields(body as Record<string, unknown>)) {
          client.release();
          return NextResponse.json(
            { error: "Only the issue creator can change assignee or ownership." },
            { status: 403 }
          );
        }
        if (status !== undefined) {
          const transitionError = validateBoardIssueStatusTransition(
            currentStatus,
            String(status),
            role
          );
          if (transitionError) {
            client.release();
            return NextResponse.json({ error: transitionError }, { status: 403 });
          }
        }
      } else if (!isIssuer) {
        client.release();
        return NextResponse.json(
          { error: "Only the assignee or issue creator can edit this issue." },
          { status: 403 }
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
      if (deadline !== undefined) {
        updates.push(`"deadline" = $${paramIndex++}`);
        values.push(deadline === null || deadline === "" ? null : new Date(deadline).toISOString());
      }
      if (comments !== undefined) {
        if (!Array.isArray(comments)) {
          client.release();
          return NextResponse.json({ error: "comments must be an array" }, { status: 400 });
        }
        let commentsJson: string;
        try {
          commentsJson = JSON.stringify(comments);
        } catch {
          client.release();
          return NextResponse.json({ error: "comments could not be serialized" }, { status: 400 });
        }
        updates.push(`"comments" = $${paramIndex++}::jsonb`);
        values.push(commentsJson);
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

      try {
        await client.query(
          `UPDATE issues 
           SET ${updates.join(", ")}
           WHERE id = $${paramIndex} AND "processId" = $${paramIndex + 1}`,
          values
        );
      } catch (updateErr: any) {
        if ((updateErr?.code === "42703" || (updateErr?.message && String(updateErr.message).includes("deadline"))) && deadline !== undefined) {
          const deadlineIdx = updates.findIndex((u) => u.includes("deadline"));
          if (deadlineIdx >= 0) {
            const updatesNoDeadline = updates.filter((_, i) => i !== deadlineIdx);
            const valuesNoDeadline = values.filter((_, i) => i !== deadlineIdx);
            const renumbered = updatesNoDeadline.map((u, i) => u.replace(/\$\d+/, `$${i + 1}`));
            await client.query(
              `UPDATE issues 
               SET ${renumbered.join(", ")}
               WHERE id = $${renumbered.length + 1} AND "processId" = $${renumbered.length + 2}`,
              valuesNoDeadline
            );
          } else {
            throw updateErr;
          }
        } else {
          throw updateErr;
        }
      }

      // Fetch the updated issue
      let updatedIssueResult;
      try {
        updatedIssueResult = await client.query(
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
          i."updatedAt",
          i."deadline",
          i."comments"
        FROM issues i
        WHERE i.id = $1`,
        [issueId]
      );
      } catch (selectErr: any) {
        if (selectErr?.code === "42703" || (selectErr?.message && String(selectErr.message).includes("deadline")) || (selectErr?.message && String(selectErr.message).includes("comments"))) {
          updatedIssueResult = await client.query(
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
          if (updatedIssueResult.rows[0]) {
            updatedIssueResult.rows[0].deadline = null;
            normalizeIssueCommentsOnRow(updatedIssueResult.rows[0] as Record<string, unknown>);
          }
        } else {
          throw selectErr;
        }
      }

      const updatedIssue = updatedIssueResult.rows[0];
      normalizeIssueCommentsOnRow(updatedIssue as Record<string, unknown>);
      
      // Invalidate cache for this issue and related caches
      cache.delete(cacheKey);
      cache.clearPattern(`org:${resolvedOrgId}:processes:*`);
      
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

        logActivity(resolvedOrgId, processId, ctx.user.id, {
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
    const resolvedOrgId = ctx.tenant.orgId;

    const client = await getTenantClient(resolvedOrgId);

    try {

      const issueResult = await client.query(
        `SELECT id, issuer FROM issues WHERE id = $1 AND "processId" = $2`,
        [issueId, processId]
      );

      if (issueResult.rows.length === 0) {
        client.release();
        return NextResponse.json(
          { error: "Issue not found" },
          { status: 404 }
        );
      }

      const uid = String(ctx.user.id);
      const issueIssuer = issueResult.rows[0].issuer;
      const isIssuer = issueIssuer != null && String(issueIssuer) === uid;
      if (!isIssuer) {
        client.release();
        return NextResponse.json(
          { error: "Only the user who created this issue can delete it." },
          { status: 403 }
        );
      }

      await client.query(
        `DELETE FROM issues WHERE id = $1`,
        [issueId]
      );
      
      // Invalidate related caches
      cache.clearPattern(`org:${resolvedOrgId}:processes:*`);

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

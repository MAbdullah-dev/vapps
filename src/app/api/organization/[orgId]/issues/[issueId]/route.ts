import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { getTenantClient } from "@/lib/db/tenant-pool";
import { ensureIssueCommentsColumn } from "@/lib/tenant-issues-schema";
import {
  isIssueCommentsOnlyPatch,
  isIssueStatusOnlyPatch,
  isSameIssueUser,
  issuePatchIncludesAssigneeForbiddenFields,
  validateBoardIssueStatusTransition,
} from "@/lib/issue-comment-permissions";
import { normalizeIssueCommentsOnRow } from "@/lib/issue-comments-normalize";
import { cache, cacheKeys } from "@/lib/cache";
import { logActivity } from "@/lib/activity-logger";
import {
  PROCESS_ACCESS_DENIED_MESSAGE,
  resolveOrgOwner,
  userHasProcessAccess,
} from "@/lib/process-access";

/**
 * GET /api/organization/[orgId]/issues/[issueId]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; issueId: string }> }
) {
  try {
    const { orgId, issueId } = await params;
    const ctx = await getRequestContext(req, orgId);
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await getTenantClient(ctx.tenant.orgId);
    try {
      await ensureIssueCommentsColumn(client);
      const result = await client.query(
        `SELECT * FROM issues WHERE id = $1`,
        [issueId]
      );
      if (!result.rows.length) {
        client.release();
        return NextResponse.json({ error: "Issue not found" }, { status: 404 });
      }
      const issue = result.rows[0] as Record<string, unknown>;
      const processId = String(issue.processId ?? issue.process_id ?? "");
      if (processId) {
        const isOwner = await resolveOrgOwner(ctx.tenant.orgId, ctx.user.id);
        const allowed = await userHasProcessAccess(
          client,
          ctx.user.id,
          processId,
          isOwner || ctx.tenant.userRole === "admin"
        );
        if (!allowed) {
          client.release();
          return NextResponse.json(
            { error: PROCESS_ACCESS_DENIED_MESSAGE },
            { status: 403 }
          );
        }
      }
      client.release();
      normalizeIssueCommentsOnRow(issue);
      return NextResponse.json({ issue });
    } catch (error: any) {
      client.release();
      return NextResponse.json(
        { error: "Failed to fetch issue", message: error.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/organization/[orgId]/issues/[issueId]
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; issueId: string }> }
) {
  try {
    const { orgId, issueId } = await params;
    const ctx = await getRequestContext(req, orgId);
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json() as Record<string, unknown>;
    const commentsOnly = isIssueCommentsOnlyPatch(body);

    const client = await getTenantClient(ctx.tenant.orgId);
    try {
      await ensureIssueCommentsColumn(client);
      const existing = await client.query(
        `SELECT id, assignee, issuer, status, "processId" FROM issues WHERE id = $1`,
        [issueId]
      );
      if (!existing.rows.length) {
        client.release();
        return NextResponse.json({ error: "Issue not found" }, { status: 404 });
      }
      const row = existing.rows[0];
      const uid = String(ctx.user.id);
      const isAssignee = isSameIssueUser(row.assignee as string | null, uid);
      const isIssuer = isSameIssueUser(row.issuer as string | null, uid);
      const currentStatus = String(row.status ?? "to-do");
      const role = { isAssignee, isIssuer };

      if (commentsOnly) {
        if (!isAssignee && !isIssuer) {
          client.release();
          return NextResponse.json(
            { error: "Only the assignee or issue creator can add comments." },
            { status: 403 }
          );
        }
      } else if (isIssueStatusOnlyPatch(body)) {
        if (!isAssignee && !isIssuer) {
          client.release();
          return NextResponse.json(
            { error: "Only the assignee or issue creator can update this issue." },
            { status: 403 }
          );
        }
        if (body.status !== undefined) {
          const transitionError = validateBoardIssueStatusTransition(
            currentStatus,
            String(body.status),
            role
          );
          if (transitionError) {
            client.release();
            return NextResponse.json({ error: transitionError }, { status: 403 });
          }
        }
      } else if (isAssignee && !isIssuer) {
        if (issuePatchIncludesAssigneeForbiddenFields(body)) {
          client.release();
          return NextResponse.json(
            { error: "Only the issue creator can change assignee or ownership." },
            { status: 403 }
          );
        }
        if (body.status !== undefined) {
          const transitionError = validateBoardIssueStatusTransition(
            currentStatus,
            String(body.status),
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

      const optionalString = (v: unknown): string | null | undefined =>
        v === undefined
          ? undefined
          : v === null
            ? null
            : typeof v === "string"
              ? v
              : undefined;

      let resolvedProcessId = optionalString(body.processId);
      let resolvedSiteId = optionalString(body.siteId);

      if (resolvedProcessId !== undefined && resolvedProcessId !== null && resolvedProcessId !== "") {
        const processRes = await client.query(
          `SELECT id, "siteId" FROM processes WHERE id = $1`,
          [resolvedProcessId]
        );
        if (!processRes.rows.length) {
          client.release();
          return NextResponse.json({ error: "Process not found" }, { status: 404 });
        }
        resolvedSiteId = processRes.rows[0].siteId;
      }

      const updates: string[] = [];
      const values: any[] = [];
      let idx = 1;
      const add = (field: string, value: any) => {
        updates.push(`${field} = $${idx++}`);
        values.push(value);
      };

      if (body.title !== undefined) {
        add(`title`, typeof body.title === "string" ? body.title.trim() : "");
      }
      if (body.description !== undefined) {
        add(
          `description`,
          typeof body.description === "string" ? body.description.trim() || null : null
        );
      }
      if (body.priority !== undefined) add(`priority`, body.priority);
      if (body.status !== undefined) add(`status`, body.status);
      if (body.points !== undefined) add(`points`, body.points);
      if (body.assignee !== undefined) add(`assignee`, body.assignee || null);
      if (body.tags !== undefined) add(`tags`, body.tags || []);
      if (body.sprintId !== undefined) add(`"sprintId"`, body.sprintId || null);
      if (body.order !== undefined) add(`"order"`, body.order);
      if (body.deadline !== undefined) {
        const deadline = body.deadline;
        add(
          `"deadline"`,
          deadline === null || deadline === ""
            ? null
            : new Date(typeof deadline === "string" ? deadline : String(deadline)).toISOString()
        );
      }
      if (body.comments !== undefined) {
        const c = body.comments;
        if (!Array.isArray(c)) {
          client.release();
          return NextResponse.json({ error: "comments must be an array" }, { status: 400 });
        }
        let commentsJson: string;
        try {
          commentsJson = JSON.stringify(c);
        } catch {
          client.release();
          return NextResponse.json({ error: "comments could not be serialized" }, { status: 400 });
        }
        updates.push(`"comments" = $${idx++}::jsonb`);
        values.push(commentsJson);
      }
      if (resolvedProcessId !== undefined) {
        add(`"processId"`, resolvedProcessId || null);
      }
      if (resolvedSiteId !== undefined) {
        add(`"siteId"`, resolvedSiteId || null);
      }

      if (!updates.length) {
        client.release();
        return NextResponse.json({ error: "No fields to update" }, { status: 400 });
      }
      updates.push(`"updatedAt" = NOW()`);
      values.push(issueId);

      await client.query(
        `UPDATE issues SET ${updates.join(", ")} WHERE id = $${idx}`,
        values
      );
      const updated = await client.query(`SELECT * FROM issues WHERE id = $1`, [issueId]);
      const updatedRow = updated.rows[0] as Record<string, unknown>;
      normalizeIssueCommentsOnRow(updatedRow);
      const tenantOrgId = ctx.tenant.orgId;
      const processIdForCache = updatedRow.processId;
      if (processIdForCache != null && String(processIdForCache) !== "") {
        cache.delete(cacheKeys.orgIssue(tenantOrgId, String(processIdForCache), issueId));
      }
      cache.clearPattern(`org:${tenantOrgId}:processes:*`);
      client.release();

      const processIdForLog =
        updatedRow.processId != null ? String(updatedRow.processId) : "";
      if (ctx.user?.id && processIdForLog) {
        const activityDetails: Record<string, unknown> = {};
        if (body.status !== undefined) {
          activityDetails.newStatus = body.status;
          activityDetails.previousStatus = row.status ?? "unknown";
        }
        if (body.assignee !== undefined) {
          activityDetails.assignee = body.assignee;
        }

        const action =
          body.status !== undefined && body.status !== row.status
            ? "issue.status_changed"
            : body.assignee !== undefined
              ? "issue.assigned"
              : "issue.updated";

        logActivity(tenantOrgId, processIdForLog, ctx.user.id, {
          action,
          entityType: "issue",
          entityId: issueId,
          entityTitle:
            typeof updatedRow.title === "string" ? updatedRow.title : String(updatedRow.title ?? ""),
          details: activityDetails,
        }).catch((err) => console.error("[Org Issue Update] Failed to log activity:", err));
      }

      return NextResponse.json({ message: "Issue updated successfully", issue: updatedRow });
    } catch (error: any) {
      client.release();
      return NextResponse.json(
        { error: "Failed to update issue", message: error.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organization/[orgId]/issues/[issueId]
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; issueId: string }> }
) {
  try {
    const { orgId, issueId } = await params;
    const ctx = await getRequestContext(req, orgId);
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await getTenantClient(ctx.tenant.orgId);
    try {
      const existing = await client.query(
        `SELECT id, issuer FROM issues WHERE id = $1`,
        [issueId]
      );
      if (!existing.rows.length) {
        client.release();
        return NextResponse.json({ error: "Issue not found" }, { status: 404 });
      }
      const row = existing.rows[0];
      const uid = String(ctx.user.id);
      const isIssuer = row.issuer != null && String(row.issuer) === uid;
      if (!isIssuer) {
        client.release();
        return NextResponse.json(
          { error: "Only the user who created this issue can delete it." },
          { status: 403 }
        );
      }
      await client.query(`DELETE FROM issues WHERE id = $1`, [issueId]);
      client.release();
      return NextResponse.json({ message: "Issue deleted successfully" });
    } catch (error: any) {
      client.release();
      return NextResponse.json(
        { error: "Failed to delete issue", message: error.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

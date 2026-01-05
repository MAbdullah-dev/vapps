import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { queryTenant, getTenantClient } from "@/lib/db/tenant-pool";
import { logActivity } from "@/lib/activity-logger";
import crypto from "crypto";

/**
 * GET /api/organization/[orgId]/processes/[processId]/issues
 * Get all issues for a process (optionally filtered by sprintId)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; processId: string }> }
) {
  try {
    const { orgId, processId } = await params;
    const { searchParams } = new URL(req.url);
    const sprintIdParam = searchParams.get("sprintId");
    // If sprintId is not in query params, it's undefined (not null)
    // null means explicitly requesting backlog, undefined means get all
    const sprintId = searchParams.has("sprintId") ? sprintIdParam : undefined;

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

      // Get issues, optionally filtered by sprintId
      // Rule: Backlog issues = status="to-do" AND sprintId IS NULL
      let issuesQuery = `
        SELECT 
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
        WHERE i."processId" = $1
      `;

      const queryParams: string[] = [processId];
      if (sprintId === null || sprintId === "null") {
        // Get backlog issues: status="to-do" AND sprintId IS NULL
        issuesQuery += ` AND i.status = 'to-do' AND i."sprintId" IS NULL`;
      } else if (sprintId) {
        // Get issues for specific sprint (exclude "done" status)
        issuesQuery += ` AND i."sprintId" = $2 AND i.status != 'done'`;
        queryParams.push(sprintId);
      } else {
        // Get all issues (including sprint issues) - no additional filter
        // This allows board to show all tasks regardless of sprint or status
        // Board will handle filtering by status in the UI
      }

      issuesQuery += ` ORDER BY i."order" ASC, i."createdAt" ASC`;

      const issuesResult = await client.query(
        issuesQuery,
        queryParams.length > 1 ? queryParams : [queryParams[0]]
      );

      client.release();

      return NextResponse.json({
        issues: issuesResult.rows,
      });
    } catch (dbError: any) {
      client.release();
      return NextResponse.json(
        { error: "Failed to fetch issues", message: dbError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error fetching issues:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organization/[orgId]/processes/[processId]/issues
 * Create a new issue
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; processId: string }> }
) {
  try {
    const { orgId, processId } = await params;
    const body = await req.json();
    const { title, tag, source, description, priority, status, points, assignee, tags, sprintId, order } = body;

    // Get request context (user + tenant) - single call, cached
    const ctx = await getRequestContext(req, orgId);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate mandatory fields
    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Issue title is required" },
        { status: 400 }
      );
    }

    if (!tag || !tag.trim()) {
      return NextResponse.json(
        { error: "Issue tag is required" },
        { status: 400 }
      );
    }

    if (!source || !source.trim()) {
      return NextResponse.json(
        { error: "Issue source is required" },
        { status: 400 }
      );
    }

    // Validate assignee is mandatory
    if (!assignee || !assignee.trim()) {
      return NextResponse.json(
        { error: "Assignee is required" },
        { status: 400 }
      );
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

      // Apply business rules for status and sprint assignment
      let finalSprintId: string | null = sprintId || null;
      let finalStatus: string;

      // Rule: If sprint is selected, status must be "in-progress"
      if (finalSprintId) {
        // Verify sprint exists and belongs to this process
        const sprintResult = await client.query(
          `SELECT id FROM sprints WHERE id = $1 AND "processId" = $2`,
          [finalSprintId, processId]
        );

        if (sprintResult.rows.length === 0) {
          client.release();
          return NextResponse.json(
            { error: "Sprint not found or doesn't belong to this process" },
            { status: 404 }
          );
        }

        // Rule: Issue in sprint must be "in-progress"
        finalStatus = "in-progress";
      } else {
        // Rule: No sprint selected → status = "to-do", sprintId = null (backlog)
        finalStatus = status || "to-do";
        finalSprintId = null;
      }

      // Prepare tags array (tag is mandatory, but tags array can have multiple)
      const tagsArray = tags && Array.isArray(tags) ? tags : [tag.trim()];

      // Insert new issue
      const issueId = crypto.randomUUID();
      await client.query(
        `INSERT INTO issues (id, title, description, priority, status, points, assignee, tags, source, "sprintId", "processId", "order", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
        [
          issueId,
          title.trim(),
          description?.trim() || null,
          priority || "medium",
          finalStatus,
          points || 0,
          assignee || null,
          tagsArray,
          source.trim(),
          finalSprintId,
          processId,
          order || 0,
        ]
      );

      // Fetch the created issue
      const issueResult = await client.query(
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

      const createdIssue = issueResult.rows[0];
      client.release();

      // Log activity (non-blocking)
      if (ctx.user?.id) {
        logActivity(orgId, processId, ctx.user.id, {
          action: "issue.created",
          entityType: "issue",
          entityId: createdIssue.id,
          entityTitle: createdIssue.title,
          details: {
            priority: createdIssue.priority,
            status: createdIssue.status,
            sprintId: createdIssue.sprintId,
          },
        }).catch((err) => console.error("[Issue Create] Failed to log activity:", err));
      }

      return NextResponse.json(
        {
          message: "Issue created successfully",
          issue: createdIssue,
        },
        { status: 201 }
      );
    } catch (dbError: any) {
      client.release();
      return NextResponse.json(
        { error: "Failed to create issue", message: dbError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error creating issue:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

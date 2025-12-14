import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-server-session";
import { prisma } from "@/lib/prisma";
import { Client } from "pg";

/**
 * PUT /api/organization/[orgId]/processes/[processId]/issues/[issueId]
 * Update an issue
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; processId: string; issueId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId, processId, issueId } = await params;
    const body = await req.json();
    const { title, description, priority, status, points, assignee, tags, sprintId, order } = body;

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

      // Verify issue exists and belongs to this process
      const issueResult = await client.query(
        `SELECT id FROM issues WHERE id = $1 AND "processId" = $2`,
        [issueId, processId]
      );

      if (issueResult.rows.length === 0) {
        await client.end();
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
            await client.end();
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
        await client.end();
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

      await client.end();

      return NextResponse.json(
        {
          message: "Issue updated successfully",
          issue: updatedIssueResult.rows[0],
        },
        { status: 200 }
      );
    } catch (dbError: any) {
      await client.end();
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
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId, processId, issueId } = await params;

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

      // Verify issue exists and belongs to this process
      const issueResult = await client.query(
        `SELECT id FROM issues WHERE id = $1 AND "processId" = $2`,
        [issueId, processId]
      );

      if (issueResult.rows.length === 0) {
        await client.end();
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

      await client.end();

      return NextResponse.json(
        {
          message: "Issue deleted successfully",
        },
        { status: 200 }
      );
    } catch (dbError: any) {
      await client.end();
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

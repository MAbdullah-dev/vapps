import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-server-session";
import { prisma } from "@/lib/prisma";
import { Client } from "pg";

/**
 * PUT /api/organization/[orgId]/processes/[processId]/tasks/[taskId]
 * Update an existing task (e.g., status change when moved between columns)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; processId: string; taskId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId, processId, taskId } = await params;
    const body = await req.json();
    const {
      name,
      description,
      sprintId,
      status,
      assigneeId,
      priority,
      points,
      startDate,
      endDate,
    } = body;

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

      // Verify task exists and belongs to the process
      const taskResult = await client.query(
        `SELECT id, "processId" FROM tasks WHERE id = $1 AND "processId" = $2`,
        [taskId, processId]
      );

      if (taskResult.rows.length === 0) {
        await client.end();
        return NextResponse.json(
          { error: "Task not found" },
          { status: 404 }
        );
      }

      // Build update query dynamically based on provided fields
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(name.trim());
      }
      if (description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(description?.trim() || null);
      }
      if (sprintId !== undefined) {
        updateFields.push(`"sprintId" = $${paramIndex++}`);
        updateValues.push(sprintId || null);
      }
      if (status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        updateValues.push(status);
      }
      if (assigneeId !== undefined) {
        updateFields.push(`"assigneeId" = $${paramIndex++}`);
        updateValues.push(assigneeId || null);
      }
      if (priority !== undefined) {
        updateFields.push(`priority = $${paramIndex++}`);
        updateValues.push(priority);
      }
      if (points !== undefined) {
        updateFields.push(`points = $${paramIndex++}`);
        updateValues.push(points);
      }
      if (startDate !== undefined) {
        updateFields.push(`"startDate" = $${paramIndex++}`);
        updateValues.push(startDate ? new Date(startDate) : null);
      }
      if (endDate !== undefined) {
        updateFields.push(`"endDate" = $${paramIndex++}`);
        updateValues.push(endDate ? new Date(endDate) : null);
      }

      if (updateFields.length === 0) {
        await client.end();
        return NextResponse.json(
          { error: "No fields to update" },
          { status: 400 }
        );
      }

      // Add updatedAt
      updateFields.push(`"updatedAt" = NOW()`);

      // Add taskId and processId for WHERE clause
      updateValues.push(taskId, processId);

      const updateQuery = `
        UPDATE tasks 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex++} AND "processId" = $${paramIndex}
      `;

      await client.query(updateQuery, updateValues);

      // Fetch the updated task
      const updatedTaskResult = await client.query(
        `SELECT * FROM tasks WHERE id = $1`,
        [taskId]
      );

      await client.end();

      return NextResponse.json(
        {
          message: "Task updated successfully",
          task: updatedTaskResult.rows[0],
        },
        { status: 200 }
      );
    } catch (dbError: any) {
      await client.end();
      return NextResponse.json(
        { error: "Failed to update task", message: dbError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

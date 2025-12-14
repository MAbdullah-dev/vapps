import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-server-session";
import { prisma } from "@/lib/prisma";
import { Client } from "pg";

/**
 * PUT /api/organization/[orgId]/processes/[processId]/sprints/[sprintId]
 * Update a sprint
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; processId: string; sprintId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId, processId, sprintId } = await params;
    const body = await req.json();
    const { name, startDate, endDate } = body;

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

      // Verify sprint exists and belongs to this process
      const sprintResult = await client.query(
        `SELECT id FROM sprints WHERE id = $1 AND "processId" = $2`,
        [sprintId, processId]
      );

      if (sprintResult.rows.length === 0) {
        await client.end();
        return NextResponse.json(
          { error: "Sprint not found" },
          { status: 404 }
        );
      }

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(name.trim());
      }
      if (startDate !== undefined) {
        updates.push(`"startDate" = $${paramIndex++}`);
        values.push(startDate);
      }
      if (endDate !== undefined) {
        updates.push(`"endDate" = $${paramIndex++}`);
        values.push(endDate);
      }

      if (updates.length === 0) {
        await client.end();
        return NextResponse.json(
          { error: "No fields to update" },
          { status: 400 }
        );
      }

      updates.push(`"updatedAt" = NOW()`);
      values.push(sprintId, processId);

      await client.query(
        `UPDATE sprints 
         SET ${updates.join(", ")}
         WHERE id = $${paramIndex++} AND "processId" = $${paramIndex++}`,
        values
      );

      // Fetch the updated sprint
      const updatedSprintResult = await client.query(
        `SELECT 
          s.id,
          s.name,
          s."startDate",
          s."endDate",
          s."processId",
          s."createdAt",
          s."updatedAt"
        FROM sprints s
        WHERE s.id = $1`,
        [sprintId]
      );

      await client.end();

      return NextResponse.json(
        {
          message: "Sprint updated successfully",
          sprint: updatedSprintResult.rows[0],
        },
        { status: 200 }
      );
    } catch (dbError: any) {
      await client.end();
      return NextResponse.json(
        { error: "Failed to update sprint", message: dbError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error updating sprint:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organization/[orgId]/processes/[processId]/sprints/[sprintId]
 * Delete a sprint
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; processId: string; sprintId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId, processId, sprintId } = await params;

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

      // Verify sprint exists and belongs to this process
      const sprintResult = await client.query(
        `SELECT id FROM sprints WHERE id = $1 AND "processId" = $2`,
        [sprintId, processId]
      );

      if (sprintResult.rows.length === 0) {
        await client.end();
        return NextResponse.json(
          { error: "Sprint not found" },
          { status: 404 }
        );
      }

      // Delete sprint (issues will have sprintId set to NULL due to ON DELETE SET NULL)
      await client.query(
        `DELETE FROM sprints WHERE id = $1`,
        [sprintId]
      );

      await client.end();

      return NextResponse.json(
        {
          message: "Sprint deleted successfully",
        },
        { status: 200 }
      );
    } catch (dbError: any) {
      await client.end();
      return NextResponse.json(
        { error: "Failed to delete sprint", message: dbError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error deleting sprint:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

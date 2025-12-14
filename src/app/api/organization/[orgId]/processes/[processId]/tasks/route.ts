import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-server-session";
import { prisma } from "@/lib/prisma";
import { Client } from "pg";
import crypto from "crypto";

/**
 * GET /api/organization/[orgId]/processes/[processId]/tasks?sprintId=xxx
 * Get all tasks for a process, optionally filtered by sprintId
 * If sprintId is not provided, returns tasks in backlog (sprintId is NULL)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; processId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId, processId } = await params;
    const { searchParams } = new URL(req.url);
    const sprintId = searchParams.get("sprintId");

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

      // Verify process exists
      const processResult = await client.query(
        `SELECT id FROM processes WHERE id = $1`,
        [processId]
      );

      if (processResult.rows.length === 0) {
        await client.end();
        return NextResponse.json(
          { error: "Process not found" },
          { status: 404 }
        );
      }

      // Build query based on sprintId filter
      let tasksQuery = `
        SELECT 
          id,
          name,
          description,
          "processId",
          "sprintId",
          status,
          "assigneeId",
          priority,
          points,
          "startDate",
          "endDate",
          "createdAt",
          "updatedAt"
        FROM tasks
        WHERE "processId" = $1
      `;

      const queryParams: string[] = [processId];

      if (sprintId === "backlog" || sprintId === null) {
        // Get backlog tasks (sprintId is NULL)
        tasksQuery += ` AND "sprintId" IS NULL`;
      } else if (sprintId) {
        // Get tasks for specific sprint
        tasksQuery += ` AND "sprintId" = $2`;
        queryParams.push(sprintId);
      }

      tasksQuery += ` ORDER BY "createdAt" DESC`;

      const tasksResult = await client.query(
        tasksQuery,
        queryParams.length > 1 ? queryParams : [queryParams[0]]
      );

      await client.end();

      return NextResponse.json({
        tasks: tasksResult.rows,
      });
    } catch (dbError: any) {
      await client.end();
      return NextResponse.json(
        { error: "Failed to fetch tasks", message: dbError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organization/[orgId]/processes/[processId]/tasks
 * Create a new task
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; processId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId, processId } = await params;
    const body = await req.json();
    const {
      name,
      description,
      sprintId,
      status = "Planned",
      assigneeId,
      priority = "medium",
      points,
      startDate,
      endDate,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Task name is required" },
        { status: 400 }
      );
    }

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

      // Verify process exists
      const processResult = await client.query(
        `SELECT id FROM processes WHERE id = $1`,
        [processId]
      );

      if (processResult.rows.length === 0) {
        await client.end();
        return NextResponse.json(
          { error: "Process not found" },
          { status: 404 }
        );
      }

      // If sprintId is provided, verify sprint exists
      if (sprintId) {
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
      }

      // Insert new task
      const taskId = crypto.randomUUID();
      await client.query(
        `INSERT INTO tasks (
          id, name, description, "processId", "sprintId", status, 
          "assigneeId", priority, points, "startDate", "endDate", 
          "createdAt", "updatedAt"
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
        [
          taskId,
          name.trim(),
          description?.trim() || null,
          processId,
          sprintId || null,
          status,
          assigneeId || null,
          priority,
          points || null,
          startDate ? new Date(startDate) : null,
          endDate ? new Date(endDate) : null,
        ]
      );

      // Fetch the created task
      const taskResult = await client.query(
        `SELECT * FROM tasks WHERE id = $1`,
        [taskId]
      );

      await client.end();

      return NextResponse.json(
        {
          message: "Task created successfully",
          task: taskResult.rows[0],
        },
        { status: 201 }
      );
    } catch (dbError: any) {
      await client.end();
      return NextResponse.json(
        { error: "Failed to create task", message: dbError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

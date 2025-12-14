import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-server-session";
import { prisma } from "@/lib/prisma";
import { Client } from "pg";

/**
 * GET /api/organization/[orgId]/processes/[processId]/users
 * Get all users who are members of this process (accepted invites)
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

      // Get all users for this process from process_users table
      // Join with master DB User table to get user details (name, email)
      const result = await client.query(
        `
        SELECT 
          pu.user_id,
          pu.role as process_role,
          pu.added_at
        FROM process_users pu
        WHERE pu.process_id = $1::text::uuid
        ORDER BY pu.added_at ASC
        `,
        [processId]
      );

      // Get user details from master database
      const userIds = result.rows.map((row: any) => row.user_id);
      
      if (userIds.length === 0) {
        await client.end();
        return NextResponse.json({ users: [] });
      }

      // Fetch user details from master DB
      const users = await prisma.user.findMany({
        where: {
          id: { in: userIds },
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      // Combine tenant and master data
      const usersWithRoles = users.map((user) => {
        const processUser = result.rows.find((row: any) => row.user_id === user.id);
        return {
          id: user.id,
          name: user.name || user.email,
          email: user.email,
          role: processUser?.process_role || "member",
        };
      });

      await client.end();

      return NextResponse.json({ users: usersWithRoles });
    } catch (dbError: any) {
      await client.end();
      return NextResponse.json(
        { error: "Failed to fetch process users", message: dbError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error fetching process users:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

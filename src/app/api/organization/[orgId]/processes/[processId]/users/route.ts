import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { getTenantClient } from "@/lib/db/tenant-pool";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/organization/[orgId]/processes/[processId]/users
 * Get all users who are members of this process (accepted invites)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; processId: string }> }
) {
  try {
    const { orgId, processId } = await params;

    // Get request context (user + tenant) - single call, cached
    const ctx = await getRequestContext(req, orgId);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use tenant pool instead of new Client()
    const client = await getTenantClient(orgId);

    try {

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
        client.release();
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

      client.release();

      return NextResponse.json({ users: usersWithRoles });
    } catch (dbError: any) {
      client.release();
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

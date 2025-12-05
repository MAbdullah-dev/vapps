import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-server-session";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/organization/list
 * Get all organizations where the current user is a member (owner, admin, or member)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get all organizations where user is a member
    const userOrgs = await prisma.userOrganization.findMany({
      where: {
        userId: user.id,
      },
      include: {
        organization: {
          include: {
            users: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
      orderBy: {
        organization: {
          createdAt: "desc",
        },
      },
    });

    // Format response
    const organizations = userOrgs.map((userOrg) => ({
      id: userOrg.organization.id,
      name: userOrg.organization.name,
      role: userOrg.role, // owner, admin, or member
      createdAt: userOrg.organization.createdAt,
      memberCount: userOrg.organization.users.length,
    }));

    return NextResponse.json({ organizations }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching user organizations:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch organizations",
        message: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

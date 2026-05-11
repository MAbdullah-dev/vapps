import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/admin-access";

export async function GET(req: NextRequest) {
  try {
    const adminUser = await getAdminUser(req);
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [totalOrganizations, activeOrganizations, suspendedOrganizations, blockedOrganizations, totalUsers, blockedUsers] =
      await Promise.all([
        prisma.organization.count(),
        prisma.organization.count({ where: { status: "active" } }),
        prisma.organization.count({ where: { status: "suspended" } }),
        prisma.organization.count({ where: { status: "blocked" } }),
        prisma.user.count(),
        prisma.user.count({ where: { isBlocked: true } }),
      ]);

    return NextResponse.json({
      totalOrganizations,
      activeOrganizations,
      suspendedOrganizations,
      blockedOrganizations,
      totalUsers,
      blockedUsers,
    });
  } catch (error) {
    console.error("Failed to fetch admin stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}

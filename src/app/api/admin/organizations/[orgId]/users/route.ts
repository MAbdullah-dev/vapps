import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/admin-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const adminUser = await getAdminUser(req);
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = await params;
    const search = req.nextUrl.searchParams.get("search")?.trim().toLowerCase();

    const memberships = await prisma.userOrganization.findMany({
      where: { organizationId: orgId },
      select: {
        userId: true,
        role: true,
        leadershipTier: true,
        jobTitle: true,
        user: {
          select: {
            name: true,
            email: true,
            lastActive: true,
            createdAt: true,
            isBlocked: true,
            blockedAt: true,
            blockReason: true,
          },
        },
      },
      orderBy: { user: { createdAt: "desc" } },
    });

    const users = memberships
      .map((membership) => ({
        id: membership.userId,
        name: membership.user.name ?? "—",
        email: membership.user.email ?? "",
        role: membership.role,
        leadershipTier: membership.leadershipTier,
        jobTitle: membership.jobTitle,
        lastActive: membership.user.lastActive,
        isBlocked: membership.user.isBlocked,
        blockedAt: membership.user.blockedAt,
        blockReason: membership.user.blockReason,
        createdAt: membership.user.createdAt,
      }))
      .filter((user) => {
        if (!search) return true;
        return (
          user.name.toLowerCase().includes(search) ||
          user.email.toLowerCase().includes(search) ||
          user.role.toLowerCase().includes(search)
        );
      });

    return NextResponse.json({ users });
  } catch (error: unknown) {
    console.error("Failed to fetch organization users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

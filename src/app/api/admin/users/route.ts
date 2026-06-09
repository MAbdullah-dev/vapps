import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/admin-access";

export async function GET(req: NextRequest) {
  try {
    const adminUser = await getAdminUser(req);
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const search = req.nextUrl.searchParams.get("search")?.trim().toLowerCase();

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        platformRole: true,
        isBlocked: true,
        blockedAt: true,
        blockReason: true,
        lastActive: true,
        createdAt: true,
        organizations: {
          select: {
            organizationId: true,
            role: true,
            organization: {
              select: {
                name: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const normalized = users
      .map((user) => ({
        id: user.id,
        name: user.name ?? "—",
        email: user.email ?? "",
        platformRole: user.platformRole,
        isBlocked: user.isBlocked,
        blockedAt: user.blockedAt,
        blockReason: user.blockReason,
        lastActive: user.lastActive,
        createdAt: user.createdAt,
        organizations: user.organizations.map((membership) => ({
          organizationId: membership.organizationId,
          organizationName: membership.organization.name,
          organizationStatus: membership.organization.status,
          role: membership.role,
        })),
      }))
      .filter((user) => {
        if (!search) return true;
        return (
          user.name.toLowerCase().includes(search) ||
          user.email.toLowerCase().includes(search) ||
          user.organizations.some((membership) =>
            membership.organizationName.toLowerCase().includes(search)
          )
        );
      });

    return NextResponse.json({ users: normalized });
  } catch (error) {
    console.error("Failed to fetch admin users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

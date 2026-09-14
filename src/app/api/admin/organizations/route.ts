import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/admin-access";

export async function GET(req: NextRequest) {
  try {
    const adminUser = await getAdminUser(req);
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        statusReason: true,
        createdAt: true,
        owner: {
          select: {
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            users: true,
            invitations: true,
          },
        },
        subscription: {
          select: {
            status: true,
            plan: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      organizations: organizations.map((org) => ({
        id: org.id,
        slug: org.slug,
        name: org.name,
        status: org.status,
        statusReason: org.statusReason,
        createdAt: org.createdAt,
        ownerName: org.owner?.name ?? null,
        ownerEmail: org.owner?.email ?? null,
        memberCount: org._count.users,
        pendingInvites: org._count.invitations,
        planName: org.subscription?.plan.name ?? null,
        planCode: org.subscription?.plan.code ?? null,
        planId: org.subscription?.plan.id ?? null,
        subscriptionStatus: org.subscription?.status ?? null,
      })),
    });
  } catch (error: unknown) {
    console.error("Failed to fetch admin organizations:", error);
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: 500 }
    );
  }
}

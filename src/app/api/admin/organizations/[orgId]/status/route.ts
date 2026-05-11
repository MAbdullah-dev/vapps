import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/admin-access";
import { logAdminAction } from "@/lib/admin-audit";
import { invalidateTenantContext } from "@/lib/tenant-context";
const allowedStatuses = new Set(["active", "suspended", "blocked"]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const adminUser = await getAdminUser(req);
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = await params;
    const body = await req.json();
    const nextStatus = String(body?.status ?? "").toLowerCase();
    const reason = typeof body?.reason === "string" ? body.reason.trim() : undefined;

    if (!allowedStatuses.has(nextStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    if ((nextStatus === "suspended" || nextStatus === "blocked") && !reason) {
      return NextResponse.json(
        { error: "Reason is required for suspend/block actions" },
        { status: 400 }
      );
    }

    const organization = await prisma.organization.update({
      where: { id: orgId },
      data: {
        status: nextStatus,
        statusReason: reason ?? null,
        statusUpdatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        status: true,
        statusReason: true,
      },
    });

    invalidateTenantContext(organization.id);

    await logAdminAction({
      adminUserId: adminUser.id,
      action: `organization.${nextStatus}`,
      targetType: "organization",
      targetId: organization.id,
      organizationId: organization.id,
      reason,
      metadata: {
        organizationName: organization.name,
        status: organization.status,
      },
    });

    return NextResponse.json({ organization });
  } catch (error) {
    console.error("Failed to update organization status:", error);
    return NextResponse.json(
      { error: "Failed to update organization status" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/admin-access";
import { logAdminAction } from "@/lib/admin-audit";
import { isValidPlatformRole, PLATFORM_ROLES } from "@/lib/platform-roles";
import { getPromotionBlockReason } from "@/lib/super-admin-policy.server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const adminUser = await getAdminUser(req);
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;
    const body = await req.json();
    const platformRole =
      typeof body?.platformRole === "string" ? body.platformRole.trim() : "";

    if (!isValidPlatformRole(platformRole)) {
      return NextResponse.json(
        { error: "platformRole must be user or super_admin" },
        { status: 400 }
      );
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, platformRole: true },
    });

    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (platformRole === PLATFORM_ROLES.SUPER_ADMIN) {
      const promotionBlock = await getPromotionBlockReason(userId);
      if (promotionBlock) {
        return NextResponse.json({ error: promotionBlock }, { status: 400 });
      }
    }

    if (
      adminUser.id === userId &&
      platformRole !== PLATFORM_ROLES.SUPER_ADMIN
    ) {
      return NextResponse.json(
        { error: "You cannot remove your own super admin access" },
        { status: 400 }
      );
    }

    if (
      target.platformRole === PLATFORM_ROLES.SUPER_ADMIN &&
      platformRole !== PLATFORM_ROLES.SUPER_ADMIN
    ) {
      const superAdminCount = await prisma.user.count({
        where: { platformRole: PLATFORM_ROLES.SUPER_ADMIN },
      });
      if (superAdminCount <= 1) {
        return NextResponse.json(
          { error: "At least one super admin must remain" },
          { status: 400 }
        );
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { platformRole },
      select: {
        id: true,
        name: true,
        email: true,
        platformRole: true,
      },
    });

    await logAdminAction({
      adminUserId: adminUser.id,
      action:
        platformRole === PLATFORM_ROLES.SUPER_ADMIN
          ? "user.super_admin_granted"
          : "user.super_admin_revoked",
      targetType: "user",
      targetId: user.id,
      metadata: {
        email: user.email,
        userName: user.name,
        platformRole,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Failed to update platform role:", error);
    return NextResponse.json(
      { error: "Failed to update platform role" },
      { status: 500 }
    );
  }
}

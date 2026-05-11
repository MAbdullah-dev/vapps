import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/admin-access";
import { logAdminAction } from "@/lib/admin-audit";

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
    const isBlocked = Boolean(body?.isBlocked);
    const reason = typeof body?.reason === "string" ? body.reason.trim() : undefined;

    if (isBlocked && !reason) {
      return NextResponse.json(
        { error: "Reason is required when blocking a user" },
        { status: 400 }
      );
    }

    if (adminUser.id === userId && isBlocked) {
      return NextResponse.json(
        { error: "You cannot block your own account" },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isBlocked,
        blockedAt: isBlocked ? new Date() : null,
        blockReason: isBlocked ? reason ?? null : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        isBlocked: true,
        blockedAt: true,
        blockReason: true,
      },
    });

    if (isBlocked) {
      await prisma.session.deleteMany({ where: { userId } }).catch(() => undefined);
    }
    await logAdminAction({
      adminUserId: adminUser.id,
      action: isBlocked ? "user.blocked" : "user.unblocked",
      targetType: "user",
      targetId: user.id,
      reason,
      metadata: {
        email: user.email,
        userName: user.name,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Failed to update user status:", error);
    return NextResponse.json({ error: "Failed to update user status" }, { status: 500 });
  }
}

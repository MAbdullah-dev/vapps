import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/get-server-session";
import { prisma } from "@/lib/prisma";
import {
  countUnusedRecoveryCodes,
  parseStoredRecoveryCodes,
} from "@/lib/two-factor-recovery";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: {
        twoFactorEnabled: true,
        twoFactorSecret: true,
        twoFactorRecoveryCodes: true,
      },
    });

    const stored = parseStoredRecoveryCodes(user?.twoFactorRecoveryCodes);
    const enabled = user?.twoFactorEnabled === true;
    const pendingSetup =
      !enabled && Boolean(user?.twoFactorSecret);

    return NextResponse.json({
      enabled,
      pendingSetup,
      unusedRecoveryCodes: enabled ? countUnusedRecoveryCodes(stored) : 0,
    });
  } catch (error) {
    console.error("2FA status error:", error);
    return NextResponse.json(
      { error: "Failed to load two-step verification status." },
      { status: 500 }
    );
  }
}

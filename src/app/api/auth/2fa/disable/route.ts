import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/get-server-session";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  decryptTwoFactorSecret,
  verifyTwoFactorToken,
} from "@/lib/two-factor";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { code?: unknown };
    const code = typeof body.code === "string" ? body.code : "";

    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: {
        twoFactorEnabled: true,
        twoFactorSecret: true,
      },
    });

    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json({ enabled: false });
    }

    const secret = decryptTwoFactorSecret(user.twoFactorSecret);
    if (!verifyTwoFactorToken(code, secret)) {
      return NextResponse.json(
        { error: "Invalid authenticator code." },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorRecoveryCodes: Prisma.JsonNull,
      },
    });

    return NextResponse.json({ enabled: false });
  } catch (error) {
    console.error("2FA disable error:", error);
    return NextResponse.json(
      { error: "Failed to disable two-step verification." },
      { status: 500 }
    );
  }
}

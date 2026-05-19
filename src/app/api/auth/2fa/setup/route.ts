import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/get-server-session";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildTwoFactorOtpauthUrl,
  buildTwoFactorQrCode,
  decryptTwoFactorSecret,
  encryptTwoFactorSecret,
  generateTwoFactorSecret,
} from "@/lib/two-factor";

async function buildSetupResponse(email: string, secret: string) {
  const otpauthUrl = buildTwoFactorOtpauthUrl({ email, secret });
  const qrCodeDataUrl = await buildTwoFactorQrCode(otpauthUrl);
  return {
    secret,
    otpauthUrl,
    qrCodeDataUrl,
  };
}

/** Returns pending setup QR if user already started but has not enabled yet. */
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: {
        email: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
      },
    });

    if (!user?.email || user.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json({ pending: false });
    }

    const secret = decryptTwoFactorSecret(user.twoFactorSecret);
    const payload = await buildSetupResponse(user.email, secret);

    return NextResponse.json({ pending: true, ...payload });
  } catch (error) {
    console.error("2FA setup GET error:", error);
    return NextResponse.json(
      { error: "Failed to load pending two-step verification setup." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: {
        email: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
      },
    });

    if (!user?.email) {
      return NextResponse.json(
        { error: "A verified email is required before enabling 2FA." },
        { status: 400 }
      );
    }

    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { error: "Two-step verification is already enabled." },
        { status: 400 }
      );
    }

    if (user.twoFactorSecret) {
      const secret = decryptTwoFactorSecret(user.twoFactorSecret);
      const payload = await buildSetupResponse(user.email, secret);
      return NextResponse.json({ ...payload, resumed: true });
    }

    const secret = generateTwoFactorSecret();
    const encryptedSecret = encryptTwoFactorSecret(secret);
    await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        twoFactorSecret: encryptedSecret,
        twoFactorEnabled: false,
        twoFactorRecoveryCodes: Prisma.JsonNull,
      },
    });

    const payload = await buildSetupResponse(user.email, secret);
    return NextResponse.json({ ...payload, resumed: false });
  } catch (error) {
    console.error("2FA setup error:", error);
    return NextResponse.json(
      { error: "Failed to start two-step verification setup." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

import { sendTwoFactorEnabledEmail } from "@/helpers/mailer";
import { getCurrentUser } from "@/lib/get-server-session";
import { prisma } from "@/lib/prisma";
import {
  decryptTwoFactorSecret,
  verifyTwoFactorToken,
} from "@/lib/two-factor";
import {
  generateRecoveryCodes,
  hashRecoveryCodes,
} from "@/lib/two-factor-recovery";
import { buildRecoveryCodesPdfBuffer } from "@/lib/two-factor-recovery-pdf";

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
        email: true,
        name: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
      },
    });

    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json(
        { error: "Two-step verification is not enabled." },
        { status: 400 }
      );
    }

    const secret = decryptTwoFactorSecret(user.twoFactorSecret);
    if (!verifyTwoFactorToken(code, secret)) {
      return NextResponse.json(
        { error: "Invalid authenticator code." },
        { status: 400 }
      );
    }

    const recoveryCodes = generateRecoveryCodes();
    const hashedRecoveryCodes = await hashRecoveryCodes(recoveryCodes);

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { twoFactorRecoveryCodes: hashedRecoveryCodes },
    });

    if (user.email) {
      try {
        const pdf = buildRecoveryCodesPdfBuffer({
          email: user.email,
          recoveryCodes,
        });
        await sendTwoFactorEnabledEmail({
          email: user.email,
          name: user.name,
          recoveryCodesPdf: pdf,
        });
      } catch (emailError) {
        console.error("2FA recovery regenerate email error:", emailError);
      }
    }

    return NextResponse.json({
      recoveryCodes,
      emailSent: Boolean(user.email),
    });
  } catch (error) {
    console.error("2FA recovery regenerate error:", error);
    return NextResponse.json(
      { error: "Failed to regenerate recovery codes." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/schemas/auth/auth.schema";
import {
  parseEmailFromPasswordResetIdentifier,
} from "@/helpers/mailer";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;

    const record = await prisma.verificationToken.findUnique({
      where: { token },
    });

    const email = record
      ? parseEmailFromPasswordResetIdentifier(record.identifier)
      : null;

    if (
      !record ||
      !email ||
      record.expires < new Date()
    ) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired. Request a new one from the login page." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });

    if (!user) {
      await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      prisma.verificationToken.delete({ where: { token } }),
    ]);

    return NextResponse.json({ ok: true, message: "Your password has been updated. You can sign in." });
  } catch (error) {
    logger.error("reset-password error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

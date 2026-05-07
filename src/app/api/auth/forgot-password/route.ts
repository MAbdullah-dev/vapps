import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/schemas/auth/auth.schema";
import {
  passwordResetIdentifier,
  sendPasswordResetEmail,
} from "@/helpers/mailer";
import { logger } from "@/lib/logger";

const GENERIC_MESSAGE =
  "If an account exists for that email, we sent password reset instructions.";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const emailInput = parsed.data.email.trim();
    const emailKey = emailInput.toLowerCase();

    const user = await prisma.user.findFirst({
      where: { email: { equals: emailInput, mode: "insensitive" } },
    });

    if (user?.password && user.email) {
      const token = crypto.randomUUID();
      const expires = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.verificationToken.deleteMany({
        where: { identifier: passwordResetIdentifier(emailKey) },
      });

      await prisma.verificationToken.create({
        data: {
          identifier: passwordResetIdentifier(emailKey),
          token,
          expires,
        },
      });

      try {
        await sendPasswordResetEmail({ email: user.email, token });
      } catch (err) {
        await prisma.verificationToken.deleteMany({
          where: { identifier: passwordResetIdentifier(emailKey), token },
        });
        logger.error("forgot-password: send mail failed", err);
        return NextResponse.json(
          { error: "Could not send email. Please try again later." },
          { status: 503 }
        );
      }
    }

    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  } catch (error) {
    logger.error("forgot-password error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

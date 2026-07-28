import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { prisma } from "@/lib/prisma";
import { resendVerificationSchema } from "@/schemas/auth/auth.schema";
import {
  emailVerifyIdentifier,
  sendVerificationEmail,
} from "@/helpers/mailer";
import { logger } from "@/lib/logger";
import {
  clientIpFromRequest,
  turnstileErrorMessage,
  turnstileErrorStatus,
  verifyTurnstileResponse,
} from "@/lib/turnstile";
import { checkRateLimit } from "@/lib/rate-limit";

const NEUTRAL_MESSAGE =
  "If an unverified account exists for that email, we sent a new verification link.";

export async function POST(req: NextRequest) {
  try {
    const ip = clientIpFromRequest(req) ?? "unknown";
    const limit = checkRateLimit(`auth:resend-verify:${ip}`, 5, 15 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSec) },
        }
      );
    }

    const body = await req.json();
    const parsed = resendVerificationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, turnstileToken } = parsed.data;

    const turnstileOk = await verifyTurnstileResponse(
      turnstileToken,
      clientIpFromRequest(req)
    );
    if (!turnstileOk.success) {
      return NextResponse.json(
        { error: turnstileErrorMessage(turnstileOk.reason) },
        { status: turnstileErrorStatus(turnstileOk.reason) }
      );
    }

    const perEmail = checkRateLimit(
      `auth:resend-verify-email:${email}`,
      3,
      60 * 60 * 1000
    );
    if (!perEmail.allowed) {
      return NextResponse.json({ ok: true, message: NEUTRAL_MESSAGE });
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });

    if (user?.email && !user.emailVerified && user.password) {
      const token = crypto.randomUUID();
      const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);
      const identifier = emailVerifyIdentifier(user.email);

      await prisma.verificationToken.deleteMany({ where: { identifier } });
      await prisma.verificationToken.create({
        data: { identifier, token, expires },
      });

      try {
        await sendVerificationEmail({ email: user.email, token });
      } catch (err) {
        await prisma.verificationToken
          .deleteMany({ where: { identifier, token } })
          .catch(() => {});
        logger.error("resend-verification: send mail failed", err);
        return NextResponse.json(
          { error: "Could not send email. Please try again later." },
          { status: 503 }
        );
      }
    }

    return NextResponse.json({ ok: true, message: NEUTRAL_MESSAGE });
  } catch (error) {
    logger.error("resend-verification error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

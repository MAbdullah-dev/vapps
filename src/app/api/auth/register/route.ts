import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/schemas/auth/auth.schema";
import {
  emailVerifyIdentifier,
  sendAccountExistsEmail,
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

/** Neutral response — same for new and existing emails (anti-enumeration). */
const NEUTRAL_MESSAGE =
  "Check your email for next steps. If you already have an account, sign in instead.";

async function issueVerificationEmail(email: string) {
  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h
  const identifier = emailVerifyIdentifier(email);

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: { identifier, token, expires },
  });

  try {
    await sendVerificationEmail({ email, token });
  } catch (err) {
    await prisma.verificationToken.deleteMany({ where: { identifier, token } });
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = clientIpFromRequest(req) ?? "unknown";
    const limit = checkRateLimit(`auth:register:${ip}`, 10, 15 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSec) },
        }
      );
    }

    const body = await req.json();

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password, turnstileToken, inviteToken } = parsed.data;

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

    const exists = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      include: { accounts: { select: { provider: true } } },
    });

    if (exists) {
      // Existing account: never create a duplicate. Email the owner with next steps,
      // but cap per-address sends so this cannot be used to flood someone's inbox.
      const notifyLimit = checkRateLimit(
        `auth:register-notify:${email}`,
        3,
        60 * 60 * 1000
      );
      if (notifyLimit.allowed) {
        try {
          if (!exists.emailVerified && exists.password && exists.email) {
            // Unverified local account — re-send verification (recover from failed mail).
            await issueVerificationEmail(exists.email);
          } else if (exists.email) {
            await sendAccountExistsEmail({
              email: exists.email,
              providers: exists.accounts.map((a) => a.provider),
              hasPassword: Boolean(exists.password),
            });
          }
        } catch (mailErr) {
          logger.error("register: notify existing user failed", mailErr, { email });
        }
      }

      return NextResponse.json({ message: NEUTRAL_MESSAGE }, { status: 200 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Create unverified user; roll back if verification email fails.
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    try {
      await issueVerificationEmail(email);
    } catch (mailErr) {
      // Do not leave a bricked unverified account with no usable recovery path.
      await prisma.verificationToken
        .deleteMany({ where: { identifier: emailVerifyIdentifier(email) } })
        .catch(() => {});
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
      logger.error("register: verification email failed", mailErr, { email });
      return NextResponse.json(
        { error: "Could not send verification email. Please try again later." },
        { status: 503 }
      );
    }

    // If inviteToken is provided, auto-verify so invite flow can proceed after login.
    let inviteAccepted = false;
    if (inviteToken) {
      try {
        const invite = await prisma.invitation.findUnique({
          where: { token: inviteToken },
        });

        if (
          invite &&
          invite.email.toLowerCase() === email &&
          invite.status === "pending"
        ) {
          await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: new Date() },
          });
          inviteAccepted = true;
          logger.info("User registered with invite token", {
            userId: user.id,
            inviteId: invite.id,
            email,
          });
        }
      } catch (inviteError) {
        logger.error("Failed to auto-accept invite during registration", inviteError, {
          userId: user.id,
          inviteToken,
        });
      }
    }

    return NextResponse.json(
      {
        message: inviteAccepted
          ? "Registration successful. You can now log in and your invitation will be accepted automatically."
          : NEUTRAL_MESSAGE,
        inviteAccepted,
        inviteToken: inviteAccepted ? inviteToken : undefined,
      },
      { status: inviteAccepted ? 201 : 200 }
    );
  } catch (error) {
    logger.error("Registration error", error);
    return NextResponse.json(
      { error: "Failed to register user" },
      { status: 500 }
    );
  }
}

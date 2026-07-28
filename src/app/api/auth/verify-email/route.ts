import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseEmailFromEmailVerifyIdentifier } from "@/helpers/mailer";

// Base URL for redirects (avoids 0.0.0.0 on EC2/behind proxy when req.url is internal)
const getRedirectBase = () =>
  process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    const base = getRedirectBase();

    if (!token) {
      return NextResponse.redirect(new URL("/auth?error=InvalidToken", base));
    }

    const record = await prisma.verificationToken.findUnique({
      where: { token },
    });

    const email = record
      ? parseEmailFromEmailVerifyIdentifier(record.identifier)
      : null;

    // Reject expired tokens and tokens from other flows (e.g. password-reset).
    if (!record || !email || record.expires < new Date()) {
      return NextResponse.redirect(new URL("/auth?error=TokenExpired", base));
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });

    if (!user) {
      await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
      return NextResponse.redirect(new URL("/auth?error=VerificationFailed", base));
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: new Date(),
          // Ensure stored email is normalized going forward.
          email,
        },
      }),
      prisma.verificationToken.delete({ where: { token } }),
    ]);

    return NextResponse.redirect(new URL("/auth?verified=true", base));
  } catch (error) {
    console.error("VERIFY_EMAIL_ERROR", error);
    return NextResponse.redirect(
      new URL("/auth?error=VerificationFailed", getRedirectBase())
    );
  }
}

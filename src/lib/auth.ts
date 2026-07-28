// lib/auth.ts
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import NextAuth, { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Apple from "next-auth/providers/apple";
import Atlassian from "next-auth/providers/atlassian";
import bcrypt from "bcryptjs";
import { turnstileErrorMessage, verifyTurnstileResponse } from "./turnstile";
import {
  decryptTwoFactorSecret,
  verifyTwoFactorToken,
} from "./two-factor";
import {
  looksLikeRecoveryCode,
  parseStoredRecoveryCodes,
  verifyAndConsumeRecoveryCode,
} from "./two-factor-recovery";
import { headers } from "next/headers";
import { isAdminHostFromHost } from "./app-hosts";
import {
  ADMIN_SESSION_COOKIE,
  APP_SESSION_COOKIE,
  getAuthSecret,
  getRequestHost,
} from "./auth-cookies";
import { checkRateLimit } from "./rate-limit";
import { normalizeEmail } from "./email-normalize";
import { isSuperAdminBlockedOnAppHost } from "./domain-auth";
import { SUPER_ADMIN_APP_LOGIN_FORBIDDEN } from "./super-admin-policy";
import { logger } from "./logger";
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    // ✅ OAuth Providers
    Google({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    Apple({
      clientId: process.env.APPLE_ID!,
      clientSecret: process.env.APPLE_SECRET!,
    }),
    Atlassian({
      clientId: process.env.ATLASSIAN_ID!,
      clientSecret: process.env.ATLASSIAN_SECRET!,
      authorization: {
        params: {
          scope: "read:me read:account",
          prompt: "consent",
        },
      }
    }),

    // ✅ Credentials Provider
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        turnstileToken: { label: "Turnstile token", type: "text" },
        twoFactorCode: { label: "Two-factor code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          throw new Error("Email and password are required");
        }

        const emailKey = normalizeEmail(String(credentials.email));
        const loginLimit = checkRateLimit(
          `auth:login:${emailKey}`,
          10,
          15 * 60 * 1000
        );
        if (!loginLimit.allowed) {
          throw new Error("Too many login attempts. Please try again later.");
        }

        const turnstileToken =
          typeof credentials.turnstileToken === "string"
            ? credentials.turnstileToken
            : undefined;
        const turnstileOk = await verifyTurnstileResponse(turnstileToken);
        if (!turnstileOk.success) {
          throw new Error(turnstileErrorMessage(turnstileOk.reason));
        }

        const user = await prisma.user.findFirst({
          where: { email: { equals: emailKey, mode: "insensitive" } },
        });

        // Same message for missing user / wrong password (anti-enumeration).
        if (!user || !user.password) {
          throw new Error("Invalid email or password");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error("Invalid email or password");
        }

        // Only reveal verification status after a correct password.
        if (!user.emailVerified) {
          throw new Error(
            "Please verify your email before logging in. Check your inbox or request a new verification link."
          );
        }

        if (user.isBlocked) {
          throw new Error("Invalid email or password");
        }

        // Super admins must use the admin portal — never mint an app-host session.
        try {
          const host = getRequestHost(await headers());
          if (isSuperAdminBlockedOnAppHost(user.platformRole, host)) {
            throw new Error(SUPER_ADMIN_APP_LOGIN_FORBIDDEN);
          }
        } catch (err) {
          if (
            err instanceof Error &&
            err.message === SUPER_ADMIN_APP_LOGIN_FORBIDDEN
          ) {
            throw err;
          }
          // headers() unavailable in rare contexts — proxy still enforces host policy
        }

        if (user.twoFactorEnabled) {
          const twoFactorCode =
            typeof credentials.twoFactorCode === "string"
              ? credentials.twoFactorCode
              : "";

          if (!twoFactorCode) {
            throw new Error("TWO_FACTOR_REQUIRED");
          }

          if (!user.twoFactorSecret) {
            throw new Error("Two-step verification is not configured correctly");
          }

          if (looksLikeRecoveryCode(twoFactorCode)) {
            const stored = parseStoredRecoveryCodes(user.twoFactorRecoveryCodes);
            const { valid, updated } = await verifyAndConsumeRecoveryCode(
              twoFactorCode,
              stored
            );
            if (!valid) {
              throw new Error("Invalid recovery code");
            }
            await prisma.user.update({
              where: { id: user.id },
              data: { twoFactorRecoveryCodes: updated },
            });
          } else {
            const twoFactorSecret = decryptTwoFactorSecret(user.twoFactorSecret);
            if (!verifyTwoFactorToken(twoFactorCode, twoFactorSecret)) {
              throw new Error("Invalid authenticator code");
            }
          }
        }

        // Update lastActive on successful login (ignore if column not yet migrated)
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              lastActive: new Date(),
              // Normalize stored email if it was created with mixed case.
              email: emailKey,
            } as { lastActive: Date; email: string },
          });
        } catch {
          // Ignore: lastActive column may not exist yet or Prisma client may be stale
        }

        return {
          id: user.id,
          name: user.name ?? undefined,
          email: emailKey,
        };
      },
    }),
  ],

  session: { strategy: "jwt" },

  /*
   * Cookie config for subdomain session sharing.
   * Set NEXTAUTH_COOKIE_DOMAIN (e.g. .lvh.me in dev, .yourapp.com in prod)
   * so the session cookie is sent for app.lvh.me, stellix.lvh.me, etc.
   * In dev use "next-auth.session-token" so the cookie is sent over HTTP (browsers
   * do not send __Secure-* cookies over non-HTTPS).
   */
  cookies: {
    sessionToken: {
      name: APP_SESSION_COOKIE,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        domain: process.env.NEXTAUTH_COOKIE_DOMAIN ?? undefined,
      },
    },
  },

  pages: {
    signIn: "/auth", // Custom login page
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        // Update lastActive when JWT is created/refreshed (on login)
        if (user.id) {
          try {
            await prisma.user.update({
              where: { id: user.id },
              data: { lastActive: new Date() } as { lastActive: Date },
            });
          } catch {
            // Ignore: lastActive column may not exist yet or Prisma client may be stale
          }
        }
      }

      if (token.sub) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { platformRole: true },
          });
          if (dbUser) {
            token.platformRole = dbUser.platformRole;
          }
        } catch {
          // Keep existing token.platformRole if DB read fails
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        // Load name, email, image from DB so session always reflects saved profile (survives logout/login)
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: {
              name: true,
              email: true,
              image: true,
              isBlocked: true,
              preferredLocale: true,
              platformRole: true,
            },
          });
          if (dbUser) {
            session.user.name = dbUser.name ?? session.user.name ?? null;
            session.user.email = dbUser.email ?? session.user.email ?? null;
            session.user.image = dbUser.image ?? session.user.image ?? null;
            session.user.isBlocked = dbUser.isBlocked;
            session.user.preferredLocale = dbUser.preferredLocale ?? null;
            session.user.platformRole = dbUser.platformRole;
          }
        } catch {
          // Keep existing session values if DB read fails
        }
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      // After login redirect - preserve invite token if present
      if (url.startsWith("/")) return baseUrl + url;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },

    async signIn({ user, account, profile }) {
      // OAuth only — credentials already validated in authorize.
      if (account?.provider === "credentials" || !user.email || !account) {
        return true;
      }

      const emailKey = normalizeEmail(user.email);

      // Reject providers that explicitly report an unverified email.
      const profileRecord = profile as Record<string, unknown> | undefined;
      const emailVerifiedClaim =
        profileRecord?.email_verified ?? profileRecord?.verified;
      if (emailVerifiedClaim === false) {
        return "/auth?error=EmailNotVerified";
      }

      const dbUser = await prisma.user.findFirst({
        where: { email: { equals: emailKey, mode: "insensitive" } },
        include: { accounts: true },
      });

      if (dbUser) {
        // Super admins must only sign in on the admin portal host.
        try {
          const host = getRequestHost(await headers());
          if (isSuperAdminBlockedOnAppHost(dbUser.platformRole, host)) {
            return `/auth?error=SuperAdminAppForbidden`;
          }
        } catch {
          // headers() may fail in edge cases; proxy still enforces host policy
        }

        const existingAccount = dbUser.accounts.find(
          (acc) =>
            acc.provider === account.provider &&
            acc.providerAccountId === account.providerAccountId
        );

        if (!existingAccount) {
          await prisma.account.create({
            data: {
              userId: dbUser.id,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              refresh_token: account.refresh_token,
              access_token: account.access_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
              session_state: account.session_state,
            },
          });
        }

        // Linking OAuth to an unverified local account: verify AND clear any
        // attacker-set password / 2FA so pre-registration takeover is impossible.
        // This must succeed — if it fails, deny the sign-in rather than leaving a
        // usable password on an account the OAuth user now controls.
        if (!dbUser.emailVerified) {
          await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              emailVerified: new Date(),
              password: null,
              twoFactorEnabled: false,
              twoFactorSecret: null,
              twoFactorRecoveryCodes: Prisma.DbNull,
            },
          });
        }

        // Normalizing a legacy mixed-case address can collide with an existing
        // lowercase row; that is a data problem, not a reason to block login.
        if (dbUser.email !== emailKey) {
          try {
            await prisma.user.update({
              where: { id: dbUser.id },
              data: { email: emailKey },
            });
          } catch (err) {
            logger.warn("signIn: could not normalize email (duplicate row?)", {
              userId: dbUser.id,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }

        try {
          await prisma.user.update({
            where: { id: dbUser.id },
            data: { lastActive: new Date() } as { lastActive: Date },
          });
        } catch {
          // Ignore: lastActive column may not exist yet
        }
      }
      // New OAuth users are handled by the adapter + `events.createUser`.

      return true;
    },
  },

  events: {
    async createUser({ user }) {
      if (!user.id) return;
      const data: {
        emailVerified?: Date;
        email?: string;
      } = {};
      if (!user.emailVerified) {
        data.emailVerified = new Date();
      }
      if (user.email) {
        data.email = normalizeEmail(user.email);
      }
      if (Object.keys(data).length === 0) return;
      await prisma.user.update({
        where: { id: user.id },
        data,
      });
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV !== "production",
};

/**
 * Host-aware auth options. On the admin portal host (admin.*) the session uses a
 * separate, host-only cookie so the admin session is independent from the app
 * session. On app/tenant hosts it keeps the shared (NEXTAUTH_COOKIE_DOMAIN) cookie.
 */
export function buildAuthOptions(host?: string | null): NextAuthOptions {
  const onAdminHost = !!host && isAdminHostFromHost(host);
  if (!onAdminHost) return authOptions;

  return {
    ...authOptions,
    // Optional separate signing key for the admin portal (falls back to NEXTAUTH_SECRET).
    secret: getAuthSecret(host),
    cookies: {
      ...authOptions.cookies,
      sessionToken: {
        name: ADMIN_SESSION_COOKIE,
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: process.env.NODE_ENV === "production",
          // Host-only cookie: scoped to admin.* so it never reaches the app domain.
          domain: undefined,
        },
      },
    },
  };
}

export default NextAuth(authOptions);

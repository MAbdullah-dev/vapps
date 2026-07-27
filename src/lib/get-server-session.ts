import { getServerSession } from "next-auth/next";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { headers } from "next/headers";
import { authOptions, buildAuthOptions } from "./auth";
import { getAuthSecret, getRequestHost, getSessionCookieName } from "./auth-cookies";
import { prisma } from "./prisma";

/**
 * Get the current authenticated user on the server.
 * In Route Handlers, always pass the request so the session is read from the incoming request.
 *
 * The session cookie name is chosen per host so the admin portal (admin.*) and the
 * customer app read their own independent sessions.
 *
 * @param req - NextRequest (required in API route handlers to read cookies from the request)
 * @returns User from session or null
 */
export async function getCurrentUser(req?: NextRequest) {
  try {
    if (req) {
      const host = getRequestHost(req.headers);
      const secret = getAuthSecret(host) ?? authOptions.secret;
      const cookieName = getSessionCookieName(host);
      const token = await getToken({
        req,
        secret: secret ?? undefined,
        cookieName,
        secureCookie: process.env.NODE_ENV === "production",
      });
      if (process.env.NODE_ENV === "development" && !token) {
        console.log("[getCurrentUser] getToken returned null – cookie name:", cookieName, "secret set:", !!secret);
      }
      if (!token?.sub) return null;
      const dbUser = await prisma.user.findUnique({
        where: { id: token.sub },
        select: { id: true, isBlocked: true },
      });
      if (!dbUser || dbUser.isBlocked) return null;
      return {
        id: dbUser.id,
        name: (token.name as string) ?? null,
        email: (token.email as string) ?? null,
      };
    }
    const host = getRequestHost(await headers());
    const session = await getServerSession(buildAuthOptions(host));
    return session?.user ?? null;
  } catch (error) {
    console.error("Error getting server session:", error);
    return null;
  }
}

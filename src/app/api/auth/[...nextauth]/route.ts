import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { buildAuthOptions } from "@/lib/auth";
import { getRequestHost } from "@/lib/auth-cookies";

/**
 * Host-aware NextAuth handler: the admin portal host uses its own session cookie
 * so app and admin sessions stay independent (see lib/auth-cookies.ts).
 */
async function handler(req: NextRequest, ctx: { params: Promise<{ nextauth: string[] }> }) {
  const host = getRequestHost(req.headers);
  return NextAuth(buildAuthOptions(host))(req, ctx);
}

export { handler as GET, handler as POST };

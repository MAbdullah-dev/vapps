import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  getSubdomainFromHost,
  isAdminHostFromHost,
  isMainAppHostFromHost,
  getAdminAppUrl,
  RESERVED_SUBDOMAINS,
} from "@/lib/app-hosts";
import { isPlatformSuperAdmin } from "@/lib/platform-roles";
import { getAdminPortalDashboardUrl } from "@/lib/super-admin-policy";

/** Session cookie name – must match authOptions.cookies.sessionToken.name in auth.ts */
const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";

/**
 * Paths that are public and do NOT require authentication.
 * Users not logged in can access these without being redirected to /auth.
 */
function isPublicPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/auth") ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/forgot-password") ||
    pathname === "/invite" ||
    pathname.startsWith("/invite/") ||
    pathname === "/welcome" ||
    pathname.startsWith("/welcome/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/privacy")
  );
}

/**
 * Get host from request (x-forwarded-host when behind proxy, else Host header).
 */
function getHost(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-host");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const host = request.headers.get("host");
  return host ?? request.nextUrl.host;
}

/**
 * Paths that must never be rewritten by subdomain logic.
 */
function shouldSkipRewrite(pathname: string): boolean {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/admin") ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/forgot-password") ||
    pathname === "/invite" ||
    pathname.startsWith("/invite/") ||
    pathname === "/welcome" ||
    pathname.startsWith("/welcome/") ||
    pathname.startsWith("/organization-setup") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  );
}

/**
 * Proxy: auth for protected routes, admin host routing, subdomain rewrite to /dashboard/[orgSlug].
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = getHost(request);

  // Platform admin host: serve /admin; do not treat "admin" as a tenant slug
  if (isAdminHostFromHost(host)) {
    if (pathname === "/" || pathname === "") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (pathname === "/auth" && !request.nextUrl.searchParams.get("callbackUrl")) {
      const authUrl = new URL("/auth", request.url);
      authUrl.searchParams.set("callbackUrl", "/admin");
      return NextResponse.redirect(authUrl);
    }
    if (!isPublicPath(pathname) && !pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  // Main app: platform admin UI lives on admin.* when configured
  if (
    isMainAppHostFromHost(host) &&
    pathname.startsWith("/admin") &&
    process.env.NEXT_PUBLIC_ADMIN_URL?.trim()
  ) {
    const adminBase = getAdminAppUrl();
    if (adminBase.startsWith("http")) {
      const target = new URL(
        `${pathname}${request.nextUrl.search}`,
        adminBase.endsWith("/") ? adminBase : `${adminBase}/`
      );
      return NextResponse.redirect(target);
    }
  }

  if (!isPublicPath(pathname)) {
    const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
    const token = await getToken({
      req: request,
      secret: secret ?? undefined,
      cookieName: SESSION_COOKIE_NAME,
      secureCookie: process.env.NODE_ENV === "production",
    });
    if (!token?.sub) {
      const authUrl = new URL("/auth", request.url);
      const callback =
        isAdminHostFromHost(host) && pathname.startsWith("/admin")
          ? "/admin"
          : pathname;
      authUrl.searchParams.set("callbackUrl", callback);
      return NextResponse.redirect(authUrl);
    }

    if (
      !isAdminHostFromHost(host) &&
      isPlatformSuperAdmin(token.platformRole as string | undefined)
    ) {
      const adminDashboard = getAdminPortalDashboardUrl();
      if (adminDashboard.startsWith("http")) {
        return NextResponse.redirect(adminDashboard);
      }
    }
  }

  if (shouldSkipRewrite(pathname)) {
    return NextResponse.next();
  }

  const subdomain = getSubdomainFromHost(host);

  if (!subdomain || RESERVED_SUBDOMAINS.has(subdomain)) {
    return NextResponse.next();
  }

  const basePath = `/dashboard/${subdomain}`;

  if (pathname.startsWith("/dashboard/")) {
    return NextResponse.rewrite(new URL(pathname, request.url));
  }

  const newPath = pathname === "/" ? basePath : `${basePath}${pathname}`;
  return NextResponse.rewrite(new URL(newPath, request.url));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg|woff2?)$).*)",
  ],
};

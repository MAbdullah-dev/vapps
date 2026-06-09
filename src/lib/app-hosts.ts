/**
 * Host detection for main app (app.*), platform admin (admin.*), and tenant subdomains.
 * Safe for Edge proxy and server components (no Prisma).
 */

import { isPlatformSuperAdmin } from "@/lib/platform-roles";

/** Subdomains that are NOT tenant org slugs. */
export const RESERVED_SUBDOMAINS = new Set(["app", "admin", "www", "localhost"]);

export function normalizeHostname(host: string): string {
  return (host.split(":")[0] ?? "").toLowerCase();
}

/**
 * Extract the first label of the host (tenant slug or reserved name).
 * With NEXT_PUBLIC_ROOT_DOMAIN=app.vietech.pro:
 *   - app.vietech.pro → null (apex main app)
 *   - acme.app.vietech.pro → "acme"
 *   - admin.vietech.pro → "admin" (via fallback, not under root domain suffix)
 */
export function getSubdomainFromHost(host: string): string | null {
  const hostname = normalizeHostname(host);
  if (!hostname || hostname === "localhost" || hostname === "127.0.0.1") {
    return null;
  }

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.toLowerCase()?.trim();
  if (rootDomain) {
    if (hostname === rootDomain || hostname === `www.${rootDomain}`) return null;
    if (hostname.endsWith(`.${rootDomain}`)) {
      return hostname.slice(0, -(rootDomain.length + 1));
    }
  }

  const parts = hostname.split(".");
  if (parts.length < 2) return null;
  const sub = parts[0];
  return sub || null;
}

/** Hostname for admin.vietech.pro (from NEXT_PUBLIC_ADMIN_URL or dev fallback). */
export function getAdminHostname(): string | null {
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL?.trim();
  if (adminUrl) {
    try {
      return new URL(adminUrl).hostname.toLowerCase();
    } catch {
      // ignore invalid URL
    }
  }

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.toLowerCase()?.trim();
  if (rootDomain?.endsWith(".lvh.me")) {
    return "admin.lvh.me";
  }
  if (rootDomain && rootDomain.includes(".")) {
    const parent = rootDomain.split(".").slice(1).join(".");
    if (parent) return `admin.${parent}`;
  }
  return null;
}

export function isAdminHostFromHost(host: string): boolean {
  const hostname = normalizeHostname(host);
  const adminHost = getAdminHostname();
  if (adminHost && hostname === adminHost) return true;
  return getSubdomainFromHost(host) === "admin";
}

export function isMainAppHostFromHost(host: string): boolean {
  const hostname = normalizeHostname(host);
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.toLowerCase()?.trim();
  if (rootDomain && (hostname === rootDomain || hostname === `www.${rootDomain}`)) {
    return true;
  }
  const sub = getSubdomainFromHost(host);
  return sub === "app" || sub === null;
}

function appOrigin(): string {
  const explicit =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const isDev = process.env.NODE_ENV !== "production";
  const protocol = isDev ? "http:" : "https:";
  const port = process.env.NEXT_PUBLIC_APP_PORT || "3000";
  const portSuffix = isDev ? `:${port}` : "";
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim();
  if (root) return `${protocol}//${root}${portSuffix}`;
  return `${protocol}//localhost${portSuffix}`;
}

/** Base URL for the main customer app (login, org list). */
export function getMainAppUrl(): string {
  return appOrigin();
}

/** Base URL for the platform admin dashboard host. */
export function getAdminAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_ADMIN_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const isDev = process.env.NODE_ENV !== "production";
  const protocol = isDev ? "http:" : "https:";
  const port = process.env.NEXT_PUBLIC_APP_PORT || "3000";
  const portSuffix = isDev ? `:${port}` : "";
  const adminHost = getAdminHostname();
  if (adminHost) return `${protocol}//${adminHost}${portSuffix}`;

  return `${appOrigin()}/admin`;
}

export function getPlatformAdminDashboardUrl(): string {
  const base = getAdminAppUrl();
  if (base.includes("/admin")) return base;
  return `${base.replace(/\/$/, "")}/admin`;
}

/**
 * Post-login destination for super admins — only when logging in on the admin platform host.
 * On app/tenant hosts, returns null so users stay in the normal application flow.
 */
export function getSuperAdminPostLoginUrl(
  platformRole?: string | null,
  host?: string
): string | null {
  if (!host || !isAdminHostFromHost(host)) return null;
  if (!isPlatformSuperAdmin(platformRole)) return null;
  return getPlatformAdminDashboardUrl();
}

/**
 * Resolve the current organization from the request host (subdomain).
 * Use in API routes and server logic to derive org from hostname instead of trusting path/query.
 */

import type { NextRequest } from "next/server";
import {
  getSubdomainFromHost,
  RESERVED_SUBDOMAINS,
} from "@/lib/app-hosts";

export { RESERVED_SUBDOMAINS };

/**
 * Get the host from the request (respects x-forwarded-host when behind a reverse proxy).
 */
export function getHost(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-host");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const host = req.headers.get("host");
  return host ?? req.nextUrl.host;
}

export { getSubdomainFromHost };

/**
 * Get the organization slug from the request host when the request is on a tenant subdomain.
 * Returns null when on root domain, app, admin, www, or localhost (no tenant context).
 */
export function getOrgSlugFromHost(req: NextRequest): string | null {
  const host = getHost(req);
  const subdomain = getSubdomainFromHost(host);
  if (!subdomain || RESERVED_SUBDOMAINS.has(subdomain)) {
    return null;
  }
  return subdomain;
}

/**
 * Check if the request is from a tenant subdomain (not app/admin/www/localhost).
 */
export function isTenantHost(req: NextRequest): boolean {
  const slug = getOrgSlugFromHost(req);
  return slug !== null;
}

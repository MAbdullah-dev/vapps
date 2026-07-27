/**
 * Per-domain session cookie naming.
 *
 * The customer app (app.vietech.pro + tenant subdomains) and the platform admin
 * portal (admin.vietech.pro) each use a DIFFERENT session cookie name so their
 * sessions are fully independent. A normal user can stay signed in on the app
 * while a super admin is signed in on the admin portal at the same time — no
 * forced logout, no cross-domain redirect.
 */

import { isAdminHostFromHost } from "@/lib/app-hosts";

const isProd = process.env.NODE_ENV === "production";

/** Session cookie for the customer app + tenant subdomains. */
export const APP_SESSION_COOKIE = isProd
  ? "__Secure-next-auth.session-token"
  : "next-auth.session-token";

/** Session cookie for the platform admin portal (admin.*). */
export const ADMIN_SESSION_COOKIE = isProd
  ? "__Secure-vietech-admin.session-token"
  : "vietech-admin.session-token";

/** Pick the session cookie name for the given request host. */
export function getSessionCookieName(host?: string | null): string {
  return host && isAdminHostFromHost(host)
    ? ADMIN_SESSION_COOKIE
    : APP_SESSION_COOKIE;
}

/**
 * Pick the JWT signing secret for the given request host.
 *
 * When ADMIN_NEXTAUTH_SECRET is set, the admin portal signs/verifies its session
 * JWT with a DIFFERENT key than the customer app. This makes an app token
 * cryptographically invalid on the admin host (and vice-versa) — defense in depth
 * on top of the per-host cookie names, so isolation no longer relies on cookie
 * naming alone. Falls back to the shared NEXTAUTH_SECRET when unset.
 */
export function getAuthSecret(host?: string | null): string | undefined {
  const appSecret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  if (host && isAdminHostFromHost(host)) {
    return process.env.ADMIN_NEXTAUTH_SECRET ?? appSecret;
  }
  return appSecret;
}

/** Read the public host from a request (honours x-forwarded-host behind a proxy). */
export function getRequestHost(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-host");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("host") ?? "";
}

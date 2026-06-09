/**
 * Domain-aware auth: super admins are admin-portal only; org users use app/tenant hosts.
 */

import { isPlatformSuperAdmin } from "@/lib/platform-roles";
import {
  getAdminAppUrl,
  getMainAppUrl,
  isAdminHostFromHost,
} from "@/lib/app-hosts";
import {
  getAdminPortalDashboardUrl,
  getAdminPortalLoginUrl,
} from "@/lib/super-admin-policy";

/** Whether the request is on the platform admin host (admin.vietech.pro). */
export function isAdminPlatformHost(host: string): boolean {
  return isAdminHostFromHost(host);
}

/** Super-admin access is only effective on the admin platform host. */
export function hasAdminPlatformAccess(
  platformRole: string | null | undefined,
  host: string
): boolean {
  return isAdminPlatformHost(host) && isPlatformSuperAdmin(platformRole);
}

/** Super admins must not use the application / tenant hosts. */
export function isSuperAdminBlockedOnAppHost(
  platformRole: string | null | undefined,
  host: string
): boolean {
  return !isAdminPlatformHost(host) && isPlatformSuperAdmin(platformRole);
}

function safeRelativePath(path?: string | null): string | null {
  if (!path?.startsWith("/") || path.startsWith("//")) return null;
  return path;
}

/** Post-login path for the current host (relative, same origin). */
export function getPostLoginPath(options: {
  host: string;
  platformRole?: string | null;
  callbackUrl?: string | null;
}): string {
  const { host, platformRole, callbackUrl } = options;
  const safeCallback = safeRelativePath(callbackUrl);

  if (isAdminPlatformHost(host)) {
    return safeCallback ?? "/admin";
  }

  if (isPlatformSuperAdmin(platformRole)) {
    return getAdminPortalDashboardUrl();
  }

  return safeCallback ?? "/auth/resolve";
}

/** Absolute URL when a super admin must leave the app host (login or deep link). */
export function getSuperAdminAppHostRedirectUrl(
  platformRole?: string | null,
  host?: string
): string | null {
  if (!host || !isSuperAdminBlockedOnAppHost(platformRole, host)) {
    return null;
  }
  return getAdminPortalDashboardUrl();
}

export { getAdminPortalLoginUrl, getAdminPortalDashboardUrl };

/** Relative signOut callback for the current host. */
export function getLogoutCallbackUrl(host: string): string {
  if (isAdminPlatformHost(host)) {
    return "/auth?callbackUrl=/admin";
  }
  return "/auth";
}

/** Absolute login URL (e.g. after cross-host redirect). */
export function getLoginUrlForHost(host: string): string {
  if (isAdminPlatformHost(host)) {
    return `${getAdminAppUrl()}/auth?callbackUrl=/admin`;
  }
  return `${getMainAppUrl()}/auth`;
}

/** Client-only host helper. */
export function getClientHost(): string {
  if (typeof window === "undefined") return "";
  return window.location.host;
}

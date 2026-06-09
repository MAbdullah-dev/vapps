/**
 * Client-safe super admin policy: messages and admin portal URLs (no Prisma).
 */

import { getAdminAppUrl } from "@/lib/app-hosts";

export const SUPER_ADMIN_ORG_FORBIDDEN =
  "Platform super admins cannot belong to organizations.";

export const SUPER_ADMIN_APP_LOGIN_FORBIDDEN =
  "Super admin accounts must sign in at the admin portal.";

export const PROMOTE_SUPER_ADMIN_REQUIRES_NO_ORGS =
  "Remove all organization memberships before granting super admin access.";

export const INVITE_SUPER_ADMIN_FORBIDDEN =
  "This email belongs to a platform super admin and cannot be invited to an organization.";

export function getAdminPortalLoginUrl(): string {
  return `${getAdminAppUrl()}/auth?callbackUrl=/admin`;
}

export function getAdminPortalDashboardUrl(): string {
  const base = getAdminAppUrl().replace(/\/$/, "");
  return `${base}/admin`;
}

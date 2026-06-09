/**
 * Server-only super admin DB checks (API routes, server components).
 */

import { prisma } from "@/lib/prisma";
import { isPlatformSuperAdmin } from "@/lib/platform-roles";
import {
  PROMOTE_SUPER_ADMIN_REQUIRES_NO_ORGS,
  SUPER_ADMIN_ORG_FORBIDDEN,
} from "@/lib/super-admin-policy";

export async function isUserSuperAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { platformRole: true },
  });
  return isPlatformSuperAdmin(user?.platformRole);
}

export async function isSuperAdminEmail(email: string): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: { email: { equals: email.trim(), mode: "insensitive" } },
    select: { platformRole: true },
  });
  return isPlatformSuperAdmin(user?.platformRole);
}

export async function userHasOrganizationTies(userId: string): Promise<boolean> {
  const [membershipCount, ownedCount] = await Promise.all([
    prisma.userOrganization.count({ where: { userId } }),
    prisma.organization.count({ where: { ownerId: userId } }),
  ]);
  return membershipCount > 0 || ownedCount > 0;
}

export async function getOrgTiesBlockReasonForSuperAdmin(
  userId: string
): Promise<string | null> {
  if (await isUserSuperAdmin(userId)) {
    return SUPER_ADMIN_ORG_FORBIDDEN;
  }
  return null;
}

export async function getPromotionBlockReason(
  userId: string
): Promise<string | null> {
  if (await userHasOrganizationTies(userId)) {
    return PROMOTE_SUPER_ADMIN_REQUIRES_NO_ORGS;
  }
  return null;
}

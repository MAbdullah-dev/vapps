/**
 * Resolve which organization a non-tenant-scoped request should bill against.
 *
 * Order: explicit org id/slug, tenant host, then the user's first membership.
 * Translation lives outside /organization/[orgId]/*, so it needs this.
 */

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgSlugFromHost } from "@/lib/get-org-from-host";
import { getOrgBySlugOrId } from "@/lib/org-utils";

export async function resolveBillingOrganizationId(params: {
  req: NextRequest;
  userId: string;
  explicitOrgId?: string | null;
}): Promise<string | null> {
  const explicit = params.explicitOrgId?.trim();
  if (explicit) {
    const org = await getOrgBySlugOrId(explicit);
    if (!org) return null;
    const member = await prisma.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId: params.userId,
          organizationId: org.id,
        },
      },
      select: { organizationId: true },
    });
    if (member) return member.organizationId;
    const owned = await prisma.organization.findFirst({
      where: { id: org.id, ownerId: params.userId },
      select: { id: true },
    });
    return owned?.id ?? null;
  }

  const hostSlug = getOrgSlugFromHost(params.req);
  if (hostSlug) {
    const org = await getOrgBySlugOrId(hostSlug);
    if (org) return org.id;
  }

  const owned = await prisma.organization.findFirst({
    where: { ownerId: params.userId },
    select: { id: true },
  });
  if (owned) return owned.id;

  const membership = await prisma.userOrganization.findFirst({
    where: { userId: params.userId },
    select: { organizationId: true },
  });
  return membership?.organizationId ?? null;
}

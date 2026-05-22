import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { roleToLeadershipTier } from "@/lib/roles";
import { canAccessOrgSettings } from "@/lib/settings-access";
import type { RequestContext } from "@/lib/request-context";

export type OrgSettingsAccess = {
  leadershipTier: string;
  isOwner: boolean;
  canAccess: boolean;
};

export async function getOrgSettingsAccess(
  ctx: RequestContext
): Promise<OrgSettingsAccess> {
  const orgId = ctx.tenant.orgId;
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { ownerId: true },
  });
  const isOwner = org?.ownerId === ctx.user.id;
  const membership = await prisma.userOrganization.findUnique({
    where: {
      userId_organizationId: { userId: ctx.user.id, organizationId: orgId },
    },
    select: { role: true, leadershipTier: true },
  });
  const role = membership?.role ?? (isOwner ? "owner" : "member");
  const leadershipTier = membership?.leadershipTier || roleToLeadershipTier(role);
  return {
    leadershipTier,
    isOwner,
    canAccess: canAccessOrgSettings(leadershipTier, isOwner),
  };
}

export function forbiddenOrgSettingsResponse() {
  return NextResponse.json(
    {
      error: "Forbidden",
      message:
        "Organization settings are only available to Level 1 (Top Leadership) users.",
    },
    { status: 403 }
  );
}

/** Returns a 403 response when the user cannot access org settings; otherwise null. */
export async function requireOrgSettingsAccess(
  ctx: RequestContext
): Promise<NextResponse | null> {
  const access = await getOrgSettingsAccess(ctx);
  if (!access.canAccess) {
    return forbiddenOrgSettingsResponse();
  }
  return null;
}

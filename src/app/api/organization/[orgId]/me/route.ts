import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { prisma } from "@/lib/prisma";
import { roleToLeadershipTier, roleToSystemRoleDisplay } from "@/lib/roles";
import { withTenantConnection } from "@/lib/db/connection-helper";

/**
 * GET /api/organization/[orgId]/me
 * Returns the current user's membership info in this org: leadership tier, system role, job title.
 * Used e.g. on the profile page to show "Support", "Member", "Senior Product Manager".
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const ctx = await getRequestContext(req, orgId);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const resolvedOrgId = ctx.tenant.orgId;

    const org = await prisma.organization.findUnique({
      where: { id: resolvedOrgId },
      select: { ownerId: true },
    });
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const isOwner = org.ownerId === ctx.user.id;
    const membership = await prisma.userOrganization.findUnique({
      where: {
        userId_organizationId: { userId: ctx.user.id, organizationId: resolvedOrgId },
      },
      select: { role: true, leadershipTier: true, jobTitle: true },
    });

    if (!membership && !isOwner) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 404 }
      );
    }

    const role = membership?.role ?? "owner";
    const leadershipTier = membership?.leadershipTier || roleToLeadershipTier(role);
    const systemRole = roleToSystemRoleDisplay(role);
    const jobTitle =
      (membership?.jobTitle && membership.jobTitle.trim()) || (isOwner ? "Owner" : null);

    let additionalRoles: string[] = [];
    try {
      additionalRoles = await withTenantConnection(ctx.tenant.connectionString, async (client) => {
        const hasUar = await client.query(
          `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_additional_roles'`
        );
        if (hasUar.rows.length === 0) return [];
        const r = await client.query(
          `SELECT ar.name
           FROM user_additional_roles uar
           JOIN additional_roles ar ON ar.id = uar.additional_role_id
           WHERE uar.user_id = $1`,
          [ctx.user.id]
        );
        return (r.rows as { name: string }[]).map((row) => row.name).filter(Boolean);
      });
    } catch {
      additionalRoles = [];
    }

    return NextResponse.json({
      userId: ctx.user.id,
      leadershipTier,
      systemRole,
      jobTitle,
      isOwner,
      additionalRoles,
    });
  } catch (error) {
    console.error("Error fetching org membership:", error);
    return NextResponse.json(
      { error: "Failed to load membership" },
      { status: 500 }
    );
  }
}

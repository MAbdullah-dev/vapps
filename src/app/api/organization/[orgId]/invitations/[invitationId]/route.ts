import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { prisma } from "@/lib/prisma";
import { withTenantConnection } from "@/lib/db/connection-helper";
import { logger } from "@/lib/logger";
import { hasPermission, type StoredPermissions } from "@/lib/permissions";
import type { Role } from "@/lib/roles";

/**
 * DELETE /api/organization/[orgId]/invitations/[invitationId]
 * Revoke a pending email invitation.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; invitationId: string }> }
) {
  const { orgId, invitationId } = await params;
  try {
    const ctx = await getRequestContext(req, orgId);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const resolvedOrgId = ctx.tenant.orgId;

    const organization = await prisma.organization.findUnique({
      where: { id: resolvedOrgId },
      select: { ownerId: true, permissions: true },
    });
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const isOrgOwner = organization.ownerId === ctx.user.id;
    const currentUserMembership = await prisma.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId: ctx.user.id,
          organizationId: resolvedOrgId,
        },
      },
      select: { role: true },
    });

    if (!currentUserMembership && !isOrgOwner) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 }
      );
    }

    if (!isOrgOwner) {
      const stored = (organization.permissions ?? null) as StoredPermissions | null;
      const currentUserRole = currentUserMembership!.role as Role;
      if (!hasPermission(stored, currentUserRole, "manage_teams")) {
        return NextResponse.json(
          { error: "You do not have permission to manage users and teams." },
          { status: 403 }
        );
      }
    }

    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, organizationId: resolvedOrgId },
      select: { id: true, token: true, email: true, status: true },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: `This invitation has already been ${invitation.status}` },
        { status: 400 }
      );
    }

    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "cancelled" },
    });

    if (ctx.tenant?.connectionString) {
      await withTenantConnection(ctx.tenant.connectionString, async (client) => {
        await client.query(
          `UPDATE invitations SET status = 'cancelled' WHERE token = $1`,
          [invitation.token]
        );
      });
    }

    logger.info("Invitation revoked", {
      invitationId: invitation.id,
      email: invitation.email,
      orgId: resolvedOrgId,
      revokedBy: ctx.user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error revoking invitation", error, { orgId, invitationId });
    return NextResponse.json(
      { error: "Failed to revoke invitation", message },
      { status: 500 }
    );
  }
}

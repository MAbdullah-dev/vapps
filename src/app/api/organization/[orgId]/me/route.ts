import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { getTenantClient } from "@/lib/db/tenant-pool";
import { prisma } from "@/lib/prisma";
import { roleToLeadershipTier, roleToSystemRoleDisplay } from "@/lib/roles";

/**
 * GET /api/organization/[orgId]/me
 * Returns the current user's membership info in this org: leadership tier, system role, job title.
 * Used e.g. on the profile page to show "Support", "Member", "Senior Product Manager".
 *
 * assignedSite / assignedProcess come only from the user's Teams profile
 * (process_users / site_users) — never from sidebar selection or "first org site".
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

    let assignedSite: {
      id: string;
      code: string | null;
      name: string;
      location: string | null;
    } | null = null;
    let assignedProcess: { id: string; name: string; siteId: string } | null = null;

    const client = await getTenantClient(resolvedOrgId);
    try {
      const userId = String(ctx.user.id);

      // Process assignment is the authoritative Teams pairing (same source as Teams UI).
      const procRes = await client.query<{
        id: string;
        name: string;
        siteId: string;
      }>(
        `SELECT p.id::text AS id, p.name, p."siteId"::text AS "siteId"
         FROM process_users pu
         INNER JOIN processes p ON p.id = pu.process_id::text
         WHERE pu.user_id::text = $1
         ORDER BY p."createdAt" ASC
         LIMIT 1`,
        [userId]
      );

      if (procRes.rows[0]) {
        assignedProcess = procRes.rows[0];
        const siteViaProc = await client.query<{
          id: string;
          code: string | null;
          name: string;
          location: string | null;
        }>(
          `SELECT s.id::text AS id, s.code, s.name, s.location
           FROM sites s
           WHERE s.id::text = $1`,
          [procRes.rows[0].siteId]
        );
        assignedSite = siteViaProc.rows[0] ?? null;
      }

      if (!assignedSite) {
        const siteRes = await client.query<{
          id: string;
          code: string | null;
          name: string;
          location: string | null;
        }>(
          `SELECT s.id::text AS id, s.code, s.name, s.location
           FROM site_users su
           INNER JOIN sites s ON s.id = su.site_id::text
           WHERE su.user_id::text = $1
           ORDER BY s."createdAt" ASC
           LIMIT 1`,
          [userId]
        );
        assignedSite = siteRes.rows[0] ?? null;
      }
    } finally {
      client.release();
    }

    return NextResponse.json({
      userId: ctx.user.id,
      leadershipTier,
      systemRole,
      jobTitle,
      isOwner,
      assignedSite,
      assignedProcess,
    });
  } catch (error) {
    console.error("Error fetching org membership:", error);
    return NextResponse.json(
      { error: "Failed to load membership" },
      { status: 500 }
    );
  }
}

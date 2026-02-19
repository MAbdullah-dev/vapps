import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { prisma } from "@/lib/prisma";
import { withTenantConnection } from "@/lib/db/connection-helper";
import { roleToLeadershipTier, roleToSystemRoleDisplay } from "@/lib/roles";

/**
 * GET /api/organization/[orgId]/members
 * Returns organization members (Active) and pending invitations (Invited) for the Teams page.
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

    // Get organization to identify owner
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { ownerId: true },
    });

    // Fetch members (UserOrganization + User)
    // Explicitly select jobTitle to ensure it's included
    const memberships = await prisma.userOrganization.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        userId: true,
        organizationId: true,
        role: true,
        leadershipTier: true,
        jobTitle: true, // Explicitly select jobTitle
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    // Fetch pending invitations; role comes from tenant (or master if migrated)
    const pendingInvites = await prisma.invitation.findMany({
      where: { organizationId: orgId, status: "pending" },
      select: { id: true, email: true, token: true, jobTitle: true },
    });

    let inviteRoles: Record<string, string> = {};
    if (ctx.tenant?.connectionString && pendingInvites.length > 0) {
      try {
        await withTenantConnection(ctx.tenant.connectionString, async (client) => {
          const tokens = pendingInvites.map((i) => i.token);
          const result = await client.query<{ token: string; role: string }>(
            `SELECT token, role FROM invitations WHERE token = ANY($1)`,
            [tokens]
          );
          result.rows.forEach((row) => {
            inviteRoles[row.token] = row.role || "member";
          });
        });
      } catch (e) {
        console.warn("Could not fetch tenant invite roles", e);
      }
    }

    // Fetch site/process assignments for Operational and Support users
    const operationalAndSupportUserIds = memberships
      .filter((m) => {
        const tier = roleToLeadershipTier(m.role);
        return tier === "Operational" || tier === "Support";
      })
      .map((m) => m.user.id);

    const siteAssignments: Record<string, { siteId: string; siteName: string }[]> = {};
    const processAssignments: Record<string, { processId: string; processName: string; siteId: string; siteName: string }[]> = {};
    const siteIdMap: Record<string, string> = {}; // Map user_id to first siteId
    const processIdMap: Record<string, string> = {}; // Map user_id to first processId

    if (operationalAndSupportUserIds.length > 0 && ctx.tenant?.connectionString) {
      try {
        await withTenantConnection(ctx.tenant.connectionString, async (client) => {
          // Get site assignments for Operational users
          const siteRows = await client.query<{
            user_id: string;
            site_id: string;
            site_name: string;
          }>(
            `SELECT su.user_id, su.site_id::text as site_id, s.name as site_name
             FROM site_users su
             INNER JOIN sites s ON s.id = su.site_id::text
             WHERE su.user_id = ANY($1)`,
            [operationalAndSupportUserIds]
          );

          siteRows.rows.forEach((row) => {
            if (!siteAssignments[row.user_id]) {
              siteAssignments[row.user_id] = [];
            }
            siteAssignments[row.user_id].push({
              siteId: row.site_id,
              siteName: row.site_name,
            });
            // Store first siteId for editing
            if (!siteIdMap[row.user_id]) {
              siteIdMap[row.user_id] = row.site_id;
            }
          });

          // Get process assignments for Support users (includes site info)
          const processRows = await client.query<{
            user_id: string;
            process_id: string;
            process_name: string;
            site_id: string;
            site_name: string;
          }>(
            `SELECT pu.user_id, pu.process_id::text as process_id, p.name as process_name,
                    p."siteId" as site_id, s.name as site_name
             FROM process_users pu
             INNER JOIN processes p ON p.id = pu.process_id::text
             INNER JOIN sites s ON s.id = p."siteId"
             WHERE pu.user_id = ANY($1)`,
            [operationalAndSupportUserIds]
          );

          processRows.rows.forEach((row) => {
            if (!processAssignments[row.user_id]) {
              processAssignments[row.user_id] = [];
            }
            processAssignments[row.user_id].push({
              processId: row.process_id,
              processName: row.process_name,
              siteId: row.site_id,
              siteName: row.site_name,
            });
            // Store first processId for editing
            if (!processIdMap[row.user_id]) {
              processIdMap[row.user_id] = row.process_id;
            }
            // Also store siteId from process if not already set
            if (!siteIdMap[row.user_id]) {
              siteIdMap[row.user_id] = row.site_id;
            }
          });
        });
      } catch (e) {
        console.warn("Could not fetch site/process assignments", e);
      }
    }

    const ownerId = organization?.ownerId;

    const activeMembers = memberships.map((m) => {
      const tier = roleToLeadershipTier(m.role);
      const sites = siteAssignments[m.user.id] || [];
      const processes = processAssignments[m.user.id] || [];
      const isOwner = m.user.id === ownerId;

      return {
        id: m.user.id,
        name: m.user.name || m.user.email || "—",
        email: m.user.email || "",
        leadershipTier: tier,
        systemRole: roleToSystemRoleDisplay(m.role),
        jobTitle: m.jobTitle ?? (isOwner ? "Owner" : undefined),
        isOwner: isOwner,
        status: "Active" as const,
        lastActive: "—",
        avatar: m.user.image ?? undefined,
        // Add site/process info for Operational and Support
        ...(tier === "Operational" && sites.length > 0
          ? { 
              siteName: sites.map((s) => s.siteName).join(", "),
              siteId: siteIdMap[m.user.id],
            }
          : {}),
        ...(tier === "Support" && processes.length > 0
          ? {
              siteName: processes[0]?.siteName || "",
              processName: processes.map((p) => p.processName).join(", "),
              siteId: siteIdMap[m.user.id],
              processId: processIdMap[m.user.id],
            }
          : {}),
      };
    });

    // For invited members, try to get site/process from invitation
    const invitedMembers = await Promise.all(
      pendingInvites.map(async (inv) => {
        const tier = roleToLeadershipTier(inviteRoles[inv.token] || "member");
        let siteName: string | undefined;
        let processName: string | undefined;

        if ((tier === "Operational" || tier === "Support") && ctx.tenant?.connectionString) {
          try {
            await withTenantConnection(ctx.tenant.connectionString, async (client) => {
              const inviteRow = await client.query<{
                site_id: string | null;
                process_id: string | null;
              }>(
                `SELECT site_id, process_id FROM invitations WHERE token = $1`,
                [inv.token]
              );

              if (inviteRow.rows.length > 0) {
                const invite = inviteRow.rows[0];
                if (invite.site_id) {
                  const siteRow = await client.query<{ name: string }>(
                    `SELECT name FROM sites WHERE id = $1::text::uuid`,
                    [invite.site_id]
                  );
                  if (siteRow.rows.length > 0) {
                    siteName = siteRow.rows[0].name;
                  }
                }
                if (invite.process_id && tier === "Support") {
                  const processRow = await client.query<{ name: string }>(
                    `SELECT name FROM processes WHERE id = $1::text::uuid`,
                    [invite.process_id]
                  );
                  if (processRow.rows.length > 0) {
                    processName = processRow.rows[0].name;
                  }
                }
              }
            });
          } catch (e) {
            console.warn("Could not fetch invite site/process", e);
          }
        }

        return {
          id: inv.id,
          name: "—",
          email: inv.email,
          leadershipTier: tier,
          systemRole: roleToSystemRoleDisplay(inviteRoles[inv.token] || "member"),
          jobTitle: inv.jobTitle ?? undefined,
          isOwner: false,
          status: "Invited" as const,
          lastActive: "Never",
          avatar: undefined,
          ...(tier === "Operational" && siteName ? { siteName } : {}),
          ...(tier === "Support" && siteName && processName
            ? { siteName, processName }
            : {}),
        };
      })
    );

    const teamMembers = [...activeMembers, ...invitedMembers];

    return NextResponse.json({ teamMembers });
  } catch (error: any) {
    console.error("Error fetching organization members:", error);
    return NextResponse.json(
      { error: "Failed to fetch members", message: error.message },
      { status: 500 }
    );
  }
}

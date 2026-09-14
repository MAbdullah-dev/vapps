import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-access";
import { getOrgBySlugOrId } from "@/lib/org-utils";
import { prisma } from "@/lib/prisma";
import { ENTITLEMENT_DEFINITIONS } from "@/lib/billing/entitlement-keys";
import { listOverrides } from "@/lib/billing/overrides";
import { ensureDefaultSubscription } from "@/lib/billing/subscription-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const adminUser = await getAdminUser(req);
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = await params;
    const org = await getOrgBySlugOrId(orgId);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    await ensureDefaultSubscription(org.id, adminUser.id);

    const [subscription, overrides, plans] = await Promise.all([
      prisma.subscription.findUnique({
        where: { organizationId: org.id },
        select: {
          id: true,
          status: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          plan: { select: { id: true, code: true, name: true } },
          planVersion: {
            select: {
              id: true,
              amountMinor: true,
              currency: true,
              versionLabel: true,
            },
          },
        },
      }),
      listOverrides(org.id),
      prisma.plan.findMany({
        where: { status: "ACTIVE" },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        select: { id: true, code: true, name: true, visibility: true, isFallback: true },
      }),
    ]);

    return NextResponse.json({
      subscription,
      overrides,
      plans,
      entitlementDefinitions: ENTITLEMENT_DEFINITIONS,
    });
  } catch (error) {
    console.error("Admin: failed to load org billing", error);
    return NextResponse.json({ error: "Failed to load billing" }, { status: 500 });
  }
}

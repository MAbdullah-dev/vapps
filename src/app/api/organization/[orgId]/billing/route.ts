import { NextRequest, NextResponse } from "next/server";
import { getRequestContextAndError } from "@/lib/request-context";
import { getOrgSettingsAccess } from "@/lib/require-org-settings-access";
import { prisma } from "@/lib/prisma";
import { ENTITLEMENT_DEFINITIONS } from "@/lib/billing/entitlement-keys";
import { getEnforcementMode } from "@/lib/billing/enforcement";
import { isPayFastConfigured } from "@/lib/billing/payfast";
import { getUsageMeters } from "@/lib/billing/usage";
import {
  getSubscriptionDetail,
  listPublicPlans,
  SubscriptionError,
} from "@/lib/billing/subscription-service";
import { applyDueBilling } from "@/lib/billing/renewal";
import type { OrgBillingResponse } from "@/lib/billing/org-types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const { context: ctx, errorResponse } = await getRequestContextAndError(req, orgId);
    if (errorResponse) return errorResponse;

    const organizationId = ctx!.tenant.orgId;
    const settingsAccess = await getOrgSettingsAccess(ctx!);

    try {
      await applyDueBilling(organizationId);
    } catch (error) {
      console.warn("[billing] lazy period apply failed", error);
    }

    const [subscription, usage, availablePlans, invoices] = await Promise.all([
      getSubscriptionDetail(organizationId),
      getUsageMeters(organizationId),
      listPublicPlans(),
      prisma.invoice.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 24,
        select: {
          id: true,
          number: true,
          status: true,
          currency: true,
          totalMinor: true,
          periodStart: true,
          periodEnd: true,
          dueAt: true,
          paidAt: true,
          createdAt: true,
        },
      }),
    ]);

    const body: OrgBillingResponse = {
      subscription,
      usage,
      availablePlans,
      invoices: invoices.map((invoice) => ({
        ...invoice,
        periodStart: invoice.periodStart.toISOString(),
        periodEnd: invoice.periodEnd.toISOString(),
        dueAt: invoice.dueAt?.toISOString() ?? null,
        paidAt: invoice.paidAt?.toISOString() ?? null,
        createdAt: invoice.createdAt.toISOString(),
      })),
      enforcement: getEnforcementMode(),
      payfastConfigured: isPayFastConfigured(),
      entitlementDefinitions: ENTITLEMENT_DEFINITIONS,
      canManage: settingsAccess.canAccess,
    };

    return NextResponse.json(body);
  } catch (error) {
    if (error instanceof SubscriptionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Billing: failed to load organization billing", error);
    return NextResponse.json({ error: "Failed to load billing" }, { status: 500 });
  }
}

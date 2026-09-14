import { NextRequest, NextResponse } from "next/server";
import { getRequestContextAndError } from "@/lib/request-context";
import { requireOrgSettingsAccess } from "@/lib/require-org-settings-access";
import {
  createPlanCheckout,
  createRenewalCheckout,
  CheckoutError,
} from "@/lib/billing/checkout";
import { appBaseUrl } from "@/lib/billing/payfast";
import { SubscriptionError } from "@/lib/billing/subscription-service";
import { isTenantHost } from "@/lib/get-org-from-host";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const { context: ctx, errorResponse } = await getRequestContextAndError(req, orgId);
    if (errorResponse) return errorResponse;

    const settingsDenied = await requireOrgSettingsAccess(ctx!);
    if (settingsDenied) return settingsDenied;

    const body = await req.json().catch(() => ({}));
    const renew = body.renew === true;
    const planId = String(body.planId ?? "").trim();
    if (!renew && !planId) {
      return NextResponse.json({ error: "planId is required" }, { status: 400 });
    }

    const origin = req.nextUrl.origin || appBaseUrl();
    const returnPath = isTenantHost(req)
      ? "/settings/billing-subscription"
      : `/dashboard/${orgId}/settings/billing-subscription`;

    const urls = {
      actorUserId: ctx!.user.id,
      customerEmail: ctx!.user.email,
      successUrl: `${origin}${returnPath}?payment=success`,
      failureUrl: `${origin}${returnPath}?payment=failed`,
      notifyUrl: `${origin}/api/billing/webhooks/payfast`,
    };

    const checkout = renew
      ? await createRenewalCheckout({
          organizationId: ctx!.tenant.orgId,
          ...urls,
        })
      : await createPlanCheckout({
          organizationId: ctx!.tenant.orgId,
          planId,
          ...urls,
        });

    return NextResponse.json(checkout);
  } catch (error) {
    if (error instanceof CheckoutError || error instanceof SubscriptionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Billing: failed to start checkout", error);
    return NextResponse.json({ error: "Failed to start checkout" }, { status: 500 });
  }
}

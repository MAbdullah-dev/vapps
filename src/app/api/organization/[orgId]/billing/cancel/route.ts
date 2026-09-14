import { NextRequest, NextResponse } from "next/server";
import { getRequestContextAndError } from "@/lib/request-context";
import { requireOrgSettingsAccess } from "@/lib/require-org-settings-access";
import {
  cancelAtPeriodEnd,
  resumeSubscription,
  SubscriptionError,
} from "@/lib/billing/subscription-service";

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
    if (body.resume === true) {
      await resumeSubscription(ctx!.tenant.orgId, ctx!.user.id);
      return NextResponse.json({ ok: true, resumed: true });
    }

    await cancelAtPeriodEnd(ctx!.tenant.orgId, ctx!.user.id);
    return NextResponse.json({ ok: true, cancelAtPeriodEnd: true });
  } catch (error) {
    if (error instanceof SubscriptionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Billing: failed to update cancellation", error);
    return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
  }
}

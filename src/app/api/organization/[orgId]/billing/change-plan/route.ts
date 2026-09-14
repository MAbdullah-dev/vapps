import { NextRequest, NextResponse } from "next/server";
import { getRequestContextAndError } from "@/lib/request-context";
import { requireOrgSettingsAccess } from "@/lib/require-org-settings-access";
import {
  requestPlanChange,
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
    const planId = String(body.planId ?? "").trim();
    if (!planId) {
      return NextResponse.json({ error: "planId is required" }, { status: 400 });
    }

    const result = await requestPlanChange({
      organizationId: ctx!.tenant.orgId,
      planId,
      actorUserId: ctx!.user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SubscriptionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Billing: failed to change plan", error);
    return NextResponse.json({ error: "Failed to change plan" }, { status: 500 });
  }
}

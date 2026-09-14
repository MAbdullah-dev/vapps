import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-access";
import {
  PlanValidationError,
  setCurrentPlanVersion,
  updatePlanVersion,
} from "@/lib/billing/plan-service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string; versionId: string }> }
) {
  try {
    const adminUser = await getAdminUser(req);
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId, versionId } = await params;
    const body = await req.json().catch(() => ({}));

    if (body.makeCurrent === true) {
      await setCurrentPlanVersion(planId, versionId, adminUser.id);
    }

    // Promoting a version to current is allowed even when it has subscribers,
    // but editing its terms is not. Only fall through to the edit path when the
    // request actually carries field changes.
    const EDITABLE_FIELDS = [
      "amountMinor",
      "versionLabel",
      "billingCycle",
      "trialDays",
      "entitlements",
    ];
    const hasEdits = EDITABLE_FIELDS.some((field) => body[field] !== undefined);
    if (!hasEdits) {
      return NextResponse.json({ success: true });
    }

    const version = await updatePlanVersion(
      planId,
      versionId,
      body,
      adminUser.id
    );
    return NextResponse.json({ version });
  } catch (error) {
    if (error instanceof PlanValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Admin: error updating plan version:", error);
    return NextResponse.json(
      { error: "Failed to update plan version" },
      { status: 500 }
    );
  }
}

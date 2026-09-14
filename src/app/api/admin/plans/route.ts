import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-access";
import {
  createPlan,
  listPlans,
  PlanValidationError,
} from "@/lib/billing/plan-service";
import { ENTITLEMENT_DEFINITIONS } from "@/lib/billing/entitlement-keys";
import { getEnforcementMode } from "@/lib/billing/enforcement";

export async function GET(req: NextRequest) {
  try {
    const adminUser = await getAdminUser(req);
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const plans = await listPlans();
    // The entitlement registry ships with the list so the admin UI renders its
    // editor from the same definitions the resolver enforces.
    return NextResponse.json({
      plans,
      entitlementDefinitions: ENTITLEMENT_DEFINITIONS,
      enforcement: getEnforcementMode(),
    });
  } catch (error) {
    console.error("Admin: error listing plans:", error);
    return NextResponse.json({ error: "Failed to list plans" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminUser = await getAdminUser(req);
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const plan = await createPlan(body, adminUser.id);
    return NextResponse.json({ plan });
  } catch (error) {
    if (error instanceof PlanValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Admin: error creating plan:", error);
    return NextResponse.json({ error: "Failed to create plan" }, { status: 500 });
  }
}

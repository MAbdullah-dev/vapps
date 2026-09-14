import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-access";
import {
  createPlanVersion,
  PlanValidationError,
} from "@/lib/billing/plan-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const adminUser = await getAdminUser(req);
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId } = await params;
    const body = await req.json().catch(() => ({}));
    const version = await createPlanVersion(planId, body, adminUser.id);
    return NextResponse.json({ version });
  } catch (error) {
    if (error instanceof PlanValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Admin: error creating plan version:", error);
    return NextResponse.json(
      { error: "Failed to create plan version" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-access";
import { runBillingRenewal } from "@/lib/billing/renewal";

export async function POST(req: NextRequest) {
  try {
    const adminUser = await getAdminUser(req);
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await runBillingRenewal();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin: billing renewal failed", error);
    return NextResponse.json({ error: "Renewal failed" }, { status: 500 });
  }
}

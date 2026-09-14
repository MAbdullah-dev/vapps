import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-access";
import {
  assignPlanByAdmin,
  SubscriptionError,
} from "@/lib/billing/subscription-service";
import { prisma } from "@/lib/prisma";
import { getOrgBySlugOrId } from "@/lib/org-utils";

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

    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: org.id },
      select: {
        id: true,
        status: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        plan: { select: { id: true, code: true, name: true } },
        planVersion: {
          select: { id: true, amountMinor: true, currency: true, versionLabel: true },
        },
      },
    });

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error("Admin: failed to load subscription", error);
    return NextResponse.json({ error: "Failed to load subscription" }, { status: 500 });
  }
}

export async function POST(
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

    const body = await req.json().catch(() => ({}));
    const planId = String(body.planId ?? "").trim();
    if (!planId) {
      return NextResponse.json({ error: "planId is required" }, { status: 400 });
    }

    await assignPlanByAdmin({
      organizationId: org.id,
      planId,
      actorUserId: adminUser.id,
      reason: typeof body.reason === "string" ? body.reason : "admin_assign",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof SubscriptionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Admin: failed to assign plan", error);
    return NextResponse.json({ error: "Failed to assign plan" }, { status: 500 });
  }
}

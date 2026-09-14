import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-access";
import { getOrgBySlugOrId } from "@/lib/org-utils";
import {
  deleteOverride,
  OverrideValidationError,
  upsertOverride,
} from "@/lib/billing/overrides";

export async function PUT(
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
    const override = await upsertOverride({
      organizationId: org.id,
      key: String(body.key ?? ""),
      kind: body.kind,
      numberValue: body.numberValue,
      boolValue: body.boolValue,
      textValue: body.textValue,
      reason: String(body.reason ?? ""),
      expiresAt: typeof body.expiresAt === "string" ? body.expiresAt : null,
      createdBy: adminUser.id,
    });

    return NextResponse.json({ override });
  } catch (error) {
    if (error instanceof OverrideValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Admin: failed to upsert override", error);
    return NextResponse.json({ error: "Failed to save override" }, { status: 500 });
  }
}

export async function DELETE(
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

    const key = req.nextUrl.searchParams.get("key")?.trim();
    if (!key) {
      return NextResponse.json({ error: "key is required" }, { status: 400 });
    }

    await deleteOverride({
      organizationId: org.id,
      key,
      adminUserId: adminUser.id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin: failed to delete override", error);
    return NextResponse.json({ error: "Failed to delete override" }, { status: 500 });
  }
}

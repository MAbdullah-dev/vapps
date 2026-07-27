import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { getGlobalAuditChecklist } from "@/lib/global-audit-checklists";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ checklistId: string }> }
) {
  try {
    const adminUser = await getAdminUser(req);
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { checklistId } = await params;
    const checklist = await getGlobalAuditChecklist(checklistId);
    if (!checklist) {
      return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
    }

    return NextResponse.json({ checklist });
  } catch (error) {
    console.error("Admin: error fetching global audit checklist:", error);
    return NextResponse.json({ error: "Failed to fetch audit checklist" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ checklistId: string }> }
) {
  try {
    const adminUser = await getAdminUser(req);
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { checklistId } = await params;
    const body = await req.json().catch(() => ({}));
    const name = (body.name ?? body.title ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    try {
      await prisma.auditChecklist.update({
        where: { id: checklistId },
        data: { name },
      });
    } catch {
      return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin: error updating global audit checklist:", error);
    return NextResponse.json({ error: "Failed to update audit checklist" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ checklistId: string }> }
) {
  try {
    const adminUser = await getAdminUser(req);
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { checklistId } = await params;

    try {
      await prisma.auditChecklist.delete({ where: { id: checklistId } });
    } catch {
      return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin: error deleting global audit checklist:", error);
    return NextResponse.json({ error: "Failed to delete audit checklist" }, { status: 500 });
  }
}

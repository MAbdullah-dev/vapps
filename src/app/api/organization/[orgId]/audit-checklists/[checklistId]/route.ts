import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { getGlobalAuditChecklist } from "@/lib/global-audit-checklists";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string; checklistId: string }> }
) {
  try {
    const { orgId, checklistId } = await params;
    const ctx = await getRequestContext(_req, orgId);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const checklist = await getGlobalAuditChecklist(checklistId);
    if (!checklist) {
      return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
    }

    return NextResponse.json({ checklist });
  } catch (error) {
    console.error("Error fetching audit checklist:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit checklist" },
      { status: 500 }
    );
  }
}

const CHECKLIST_ADMIN_ONLY =
  "Audit checklist management is only available in the platform admin portal.";

export async function PATCH(
  _req: NextRequest,
  _ctx: { params: Promise<{ orgId: string; checklistId: string }> }
) {
  return NextResponse.json({ error: CHECKLIST_ADMIN_ONLY }, { status: 403 });
}

export async function DELETE(
  _req: NextRequest,
  _ctx: { params: Promise<{ orgId: string; checklistId: string }> }
) {
  return NextResponse.json({ error: CHECKLIST_ADMIN_ONLY }, { status: 403 });
}

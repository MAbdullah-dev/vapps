import { NextRequest, NextResponse } from "next/server";

const CHECKLIST_ADMIN_ONLY =
  "Audit checklist management is only available in the platform admin portal.";

export async function PATCH(
  _req: NextRequest,
  _ctx: { params: Promise<{ orgId: string; checklistId: string; questionId: string }> }
) {
  return NextResponse.json({ error: CHECKLIST_ADMIN_ONLY }, { status: 403 });
}

export async function DELETE(
  _req: NextRequest,
  _ctx: { params: Promise<{ orgId: string; checklistId: string; questionId: string }> }
) {
  return NextResponse.json({ error: CHECKLIST_ADMIN_ONLY }, { status: 403 });
}

import { NextRequest, NextResponse } from "next/server";

const CHECKLIST_ADMIN_ONLY =
  "Audit checklist management is only available in the platform admin portal.";

export async function POST(
  _req: NextRequest,
  _ctx: { params: Promise<{ orgId: string; checklistId: string }> }
) {
  return NextResponse.json({ error: CHECKLIST_ADMIN_ONLY }, { status: 403 });
}

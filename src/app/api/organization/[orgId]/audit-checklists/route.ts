import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { listGlobalAuditChecklists } from "@/lib/global-audit-checklists";

/**
 * GET /api/organization/[orgId]/audit-checklists
 * List platform-wide audit checklists (read-only for org members).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const ctx = await getRequestContext(_req, orgId);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const checklists = await listGlobalAuditChecklists();
    return NextResponse.json({ checklists });
  } catch (error) {
    console.error("Error listing audit checklists:", error);
    return NextResponse.json(
      { error: "Failed to list audit checklists" },
      { status: 500 }
    );
  }
}

const CHECKLIST_ADMIN_ONLY =
  "Audit checklist management is only available in the platform admin portal.";

/** Writes moved to platform admin — org members may only read checklists. */
export async function POST(
  _req: NextRequest,
  _ctx: { params: Promise<{ orgId: string }> }
) {
  return NextResponse.json({ error: CHECKLIST_ADMIN_ONLY }, { status: 403 });
}

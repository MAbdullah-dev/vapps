import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { withTenantConnection } from "@/lib/db/connection-helper";

/**
 * GET /api/organization/[orgId]/audit-checklists
 * List all audit checklists for the org (tenant).
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

    const connectionString = ctx.tenant.connectionString;
    if (!connectionString) {
      return NextResponse.json({ error: "Tenant database not found" }, { status: 404 });
    }

    const checklists: { id: string; name: string; questionCount: number; createdAt: string }[] = [];

    await withTenantConnection(connectionString, async (client) => {
      const tableCheck = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_checklists'`
      );
      if (tableCheck.rows.length === 0) return;

      const result = await client.query(
        `SELECT c.id, c.name, c.created_at,
                (SELECT COUNT(*)::int FROM audit_checklist_questions q WHERE q.audit_checklist_id = c.id) as question_count
         FROM audit_checklists c
         ORDER BY c.name`
      );
      for (const row of result.rows) {
        checklists.push({
          id: row.id,
          name: row.name ?? "",
          questionCount: row.question_count ?? 0,
          createdAt: row.created_at ?? new Date().toISOString(),
        });
      }
    });

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

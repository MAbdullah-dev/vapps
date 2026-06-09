import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { withTenantConnection } from "@/lib/db/connection-helper";

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

    const connectionString = ctx.tenant.connectionString;
    if (!connectionString) {
      return NextResponse.json({ error: "Tenant database not found" }, { status: 404 });
    }

    let checklist: {
      id: string;
      name: string;
      questions: Array<{
        id: string;
        clause: string;
        subclause: string;
        requirement: string;
        question: string;
        evidenceExample: string;
        sortOrder: number;
      }>;
    } | null = null;

    await withTenantConnection(connectionString, async (client) => {
      const listCheck = await client.query(
        `SELECT id, name FROM audit_checklists WHERE id = $1`,
        [checklistId]
      );
      const row = listCheck.rows[0];
      if (!row) return;

      const questionsResult = await client.query(
        `SELECT id, clause, subclause, requirement, question, evidence_example, sort_order
         FROM audit_checklist_questions
         WHERE audit_checklist_id = $1
         ORDER BY sort_order, clause, subclause`,
        [checklistId]
      );

      checklist = {
        id: row.id,
        name: row.name ?? "",
        questions: questionsResult.rows.map((q) => ({
          id: q.id,
          clause: q.clause ?? "",
          subclause: q.subclause ?? "",
          requirement: q.requirement ?? "",
          question: q.question ?? "",
          evidenceExample: q.evidence_example ?? "",
          sortOrder: q.sort_order ?? 0,
        })),
      };
    });

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

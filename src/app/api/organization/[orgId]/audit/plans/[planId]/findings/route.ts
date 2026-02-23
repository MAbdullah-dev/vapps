import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { withTenantConnection } from "@/lib/db/connection-helper";

/**
 * GET /api/organization/[orgId]/audit/plans/[planId]/findings
 * Get saved checklist findings for this audit plan.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; planId: string }> }
) {
  try {
    const { orgId, planId } = await params;
    const ctx = await getRequestContext(req, orgId);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connectionString = ctx.tenant.connectionString;
    if (!connectionString) {
      return NextResponse.json({ error: "Tenant database not found" }, { status: 404 });
    }

    const findings: any[] = [];

    await withTenantConnection(connectionString, async (client) => {
      const tableCheck = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_plan_findings'`
      );
      if (tableCheck.rows.length === 0) return;

      const result = await client.query(
        `SELECT id, row_index, standard, clause, subclauses, requirement, question, evidence_example, evidence_seen, status,
                statement_of_nonconformity, risk_severity
         FROM audit_plan_findings WHERE audit_plan_id = $1 ORDER BY row_index`,
        [planId]
      );
      for (const row of result.rows) {
        findings.push({
          id: row.id,
          rowIndex: row.row_index,
          standard: row.standard,
          clause: row.clause,
          subclauses: row.subclauses,
          requirement: row.requirement,
          question: row.question,
          evidenceExample: row.evidence_example,
          evidenceSeen: row.evidence_seen,
          status: row.status,
          statementOfNonconformity: row.statement_of_nonconformity ?? undefined,
          riskSeverity: row.risk_severity ?? undefined,
        });
      }
    });

    return NextResponse.json({ findings });
  } catch (error) {
    console.error("Error fetching findings:", error);
    return NextResponse.json(
      { error: "Failed to fetch findings" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/organization/[orgId]/audit/plans/[planId]/findings
 * Save checklist findings (Step 3). Body: { findings: Array<{ standard, clause, subclauses, requirement, question, evidenceExample, evidenceSeen, status }> }
 * Replaces all findings for this plan.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; planId: string }> }
) {
  try {
    const { orgId, planId } = await params;
    const ctx = await getRequestContext(req, orgId);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connectionString = ctx.tenant.connectionString;
    if (!connectionString) {
      return NextResponse.json({ error: "Tenant database not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const findings: any[] = Array.isArray(body.findings) ? body.findings : [];

    await withTenantConnection(connectionString, async (client) => {
      const tableCheck = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_plan_findings'`
      );
      if (tableCheck.rows.length === 0) {
        throw new Error("audit_plan_findings table does not exist. Run tenant migration 014.");
      }

      await client.query(`DELETE FROM audit_plan_findings WHERE audit_plan_id = $1`, [planId]);

      for (let i = 0; i < findings.length; i++) {
        const f = findings[i];
        await client.query(
          `INSERT INTO audit_plan_findings (audit_plan_id, row_index, standard, clause, subclauses, requirement, question, evidence_example, evidence_seen, status, statement_of_nonconformity, risk_severity)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            planId,
            i,
            f.standard ?? null,
            f.clause ?? null,
            f.subclauses ?? null,
            f.requirement ?? null,
            f.question ?? null,
            f.evidenceExample ?? f.evidence_example ?? null,
            f.evidenceSeen ?? f.evidence_seen ?? null,
            f.status ?? "not_audited",
            f.statementOfNonconformity ?? f.statement_of_nonconformity ?? null,
            f.riskSeverity ?? f.risk_severity ?? null,
          ]
        );
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error saving findings:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to save findings" },
      { status: 500 }
    );
  }
}

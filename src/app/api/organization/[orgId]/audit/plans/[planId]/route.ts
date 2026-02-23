import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { withTenantConnection } from "@/lib/db/connection-helper";

/**
 * GET /api/organization/[orgId]/audit/plans/[planId]
 * Get one audit plan with program and assigned auditors.
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

    let plan: any = null;

    await withTenantConnection(connectionString, async (client) => {
      const tableCheck = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_plans'`
      );
      if (tableCheck.rows.length === 0) return;

      const planResult = await client.query(
        `SELECT ap.id, ap.audit_program_id, ap.status, ap.lead_auditor_user_id, ap.auditee_user_id,
                ap.title, ap.audit_number, ap.criteria, ap.planned_date, ap.date_prepared,
                ap.plan_submitted_at, ap.findings_submitted_at, ap.created_at,
                p.name as program_name, p.audit_type, p.audit_criteria as program_criteria
         FROM audit_plans ap
         JOIN audit_programs p ON p.id = ap.audit_program_id
         WHERE ap.id = $1`,
        [planId]
      );
      const row = planResult.rows[0];
      if (!row) return;

      plan = {
        id: row.id,
        auditProgramId: row.audit_program_id,
        status: row.status,
        leadAuditorUserId: row.lead_auditor_user_id,
        auditeeUserId: row.auditee_user_id,
        title: row.title,
        auditNumber: row.audit_number,
        criteria: row.criteria,
        plannedDate: row.planned_date,
        datePrepared: row.date_prepared,
        planSubmittedAt: row.plan_submitted_at,
        findingsSubmittedAt: row.findings_submitted_at,
        createdAt: row.created_at,
        programName: row.program_name,
        auditType: row.audit_type,
        programCriteria: row.program_criteria,
        assignedAuditorIds: [] as string[],
      };

      const assignResult = await client.query(
        `SELECT user_id FROM audit_plan_assignments WHERE audit_plan_id = $1`,
        [planId]
      );
      plan.assignedAuditorIds = assignResult.rows.map((r) => r.user_id);
    });

    if (!plan) {
      return NextResponse.json({ error: "Audit plan not found" }, { status: 404 });
    }

    const userId = ctx.user.id;
    plan.currentUserRole =
      plan.leadAuditorUserId === userId
        ? "lead_auditor"
        : plan.auditeeUserId === userId
          ? "auditee"
          : plan.assignedAuditorIds?.includes(userId)
            ? "assigned_auditor"
            : null;

    return NextResponse.json({ plan });
  } catch (error) {
    console.error("Error fetching audit plan:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit plan" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/organization/[orgId]/audit/plans/[planId]
 * Update audit plan (e.g. status = findings_submitted_to_auditee when auditor submits from Step 3).
 * Body: { status: string }
 */
export async function PATCH(
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
    const status = body.status;

    if (!status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    await withTenantConnection(connectionString, async (client) => {
      const tableCheck = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_plans'`
      );
      if (tableCheck.rows.length === 0) {
        throw new Error("audit_plans table does not exist");
      }

      if (status === "findings_submitted_to_auditee") {
        await client.query(
          `UPDATE audit_plans SET status = $1, findings_submitted_at = now(), updated_at = now() WHERE id = $2`,
          [status, planId]
        );
      } else {
        await client.query(
          `UPDATE audit_plans SET status = $1, updated_at = now() WHERE id = $2`,
          [status, planId]
        );
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update audit plan";
    console.error("Error updating audit plan:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

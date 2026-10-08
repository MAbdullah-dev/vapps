import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import type { RequestContext } from "@/lib/request-context";
import { AUDIT_MANAGER_ROLES, roleIsOneOf } from "@/lib/require-org-role";

export type AuditPlanStakeholders = {
  leadAuditorUserId: string | null;
  auditeeUserId: string | null;
  assignedAuditorIds: string[];
};

export function isAuditPlanStakeholder(
  userId: string,
  plan: AuditPlanStakeholders
): boolean {
  if (plan.leadAuditorUserId === userId) return true;
  if (plan.auditeeUserId === userId) return true;
  return plan.assignedAuditorIds.includes(userId);
}

export function canAccessAuditPlan(
  ctx: RequestContext,
  plan: AuditPlanStakeholders
): boolean {
  if (roleIsOneOf(ctx.tenant.userRole, AUDIT_MANAGER_ROLES)) return true;
  return isAuditPlanStakeholder(ctx.user.id, plan);
}

export function canWriteAuditFindings(
  ctx: RequestContext,
  plan: AuditPlanStakeholders
): boolean {
  if (roleIsOneOf(ctx.tenant.userRole, AUDIT_MANAGER_ROLES)) return true;
  return plan.assignedAuditorIds.includes(ctx.user.id);
}

export function canSetAuditPlanStatus(
  ctx: RequestContext,
  plan: AuditPlanStakeholders,
  status: string
): boolean {
  if (roleIsOneOf(ctx.tenant.userRole, AUDIT_MANAGER_ROLES)) return true;
  const uid = ctx.user.id;
  const isLead = plan.leadAuditorUserId === uid;
  const isAssigned = plan.assignedAuditorIds.includes(uid);
  const isAuditee = plan.auditeeUserId === uid;
  switch (status) {
    case "draft":
    case "plan_submitted_to_auditee":
      return isLead;
    case "findings_submitted_to_auditee":
    case "pending_closure":
      return isAssigned;
    case "ca_submitted_to_auditor":
      return isAuditee;
    case "verification_ineffective":
      return isAssigned || isLead;
    case "closed":
      return isLead;
    default:
      return isLead || isAssigned || isAuditee;
  }
}

export function auditPlanForbiddenResponse(): NextResponse {
  return NextResponse.json(
    {
      error: "Forbidden",
      message: "You do not have access to this audit plan.",
    },
    { status: 403 }
  );
}

export async function loadAuditPlanStakeholders(
  client: PoolClient,
  planId: string
): Promise<AuditPlanStakeholders | null> {
  const tableCheck = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_plans'`
  );
  if (tableCheck.rows.length === 0) return null;

  const planRes = await client.query<{
    lead_auditor_user_id: string | null;
    auditee_user_id: string | null;
  }>(
    `SELECT lead_auditor_user_id, auditee_user_id FROM audit_plans WHERE id = $1`,
    [planId]
  );
  const row = planRes.rows[0];
  if (!row) return null;

  const assignRes = await client.query<{ user_id: string }>(
    `SELECT user_id FROM audit_plan_assignments WHERE audit_plan_id = $1`,
    [planId]
  );

  return {
    leadAuditorUserId: row.lead_auditor_user_id ?? null,
    auditeeUserId: row.auditee_user_id ?? null,
    assignedAuditorIds: assignRes.rows.map((r) => r.user_id),
  };
}

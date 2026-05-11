import type { PoolClient } from "pg";

export type OrgActivityFeedItem = {
  id: string;
  processId: string | null;
  userId: string | null;
  userName: string;
  userEmail: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  entityTitle?: string;
  details: Record<string, unknown>;
  createdAt: string;
  processName?: string | null;
};

function auditStatusLabel(status: string | null): string {
  switch (status) {
    case "plan_submitted_to_auditee":
      return "Submitted to auditee";
    case "findings_submitted_to_auditee":
      return "Findings submitted";
    case "ca_submitted_to_auditor":
      return "Corrective action submitted";
    case "verification_ineffective":
      return "Returned to auditee";
    case "pending_closure":
      return "Pending closure";
    case "closed":
      return "Closed";
    default:
      return status || "Updated";
  }
}

/**
 * Loads recent org-wide activity for the tenant: all process activity_log rows,
 * audit plan snapshots, document module workflow history, merged by date.
 * Used by dashboard "Recent Activity" and the topbar notifications feed (before per-user dismissals).
 */
export async function fetchOrgWideActivityFeed(
  client: PoolClient,
  limit: number
): Promise<OrgActivityFeedItem[]> {
  const cap = Math.min(Math.max(limit, 1), 50);
  const perSource = Math.min(cap * 2, 80);

  const activityResult = await client.query(
    `SELECT 
      al.id,
      al."processId",
      al."userId",
      al."userName",
      al."userEmail",
      al.action,
      al."entityType",
      al."entityId",
      al."entityTitle",
      al.details,
      al."createdAt",
      p.name as "processName"
    FROM activity_log al
    LEFT JOIN processes p ON p.id = al."processId"
    ORDER BY al."createdAt" DESC
    LIMIT $1`,
    [perSource]
  );

  const processActivities: OrgActivityFeedItem[] = (activityResult.rows || []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    processId: row.processId != null ? String(row.processId) : null,
    userId: row.userId != null ? String(row.userId) : null,
    userName: String(row.userName ?? "Someone"),
    userEmail: row.userEmail != null ? String(row.userEmail) : null,
    action: String(row.action ?? ""),
    entityType: String(row.entityType ?? ""),
    entityId: row.entityId != null ? String(row.entityId) : undefined,
    entityTitle: row.entityTitle != null ? String(row.entityTitle) : undefined,
    details: (typeof row.details === "object" && row.details !== null && !Array.isArray(row.details)
      ? (row.details as Record<string, unknown>)
      : {}) as Record<string, unknown>,
    createdAt: row.createdAt as string,
    processName: row.processName != null ? String(row.processName) : null,
  }));

  const auditActivities: OrgActivityFeedItem[] = [];
  try {
    const auditTableCheck = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_plans'`
    );
    if (auditTableCheck.rows.length > 0) {
      const auditResult = await client.query(
        `SELECT ap.id, ap.title, ap.audit_number, ap.status,
                COALESCE(ap.updated_at, ap.plan_submitted_at, ap.created_at) as "createdAt"
         FROM audit_plans ap
         ORDER BY COALESCE(ap.updated_at, ap.plan_submitted_at, ap.created_at) DESC
         LIMIT $1`,
        [Math.min(25, perSource)]
      );
      for (const row of auditResult.rows) {
        const statusLabel = auditStatusLabel(row.status ?? null);
        auditActivities.push({
          id: `audit-${row.id}`,
          processId: null,
          userId: null,
          userName: "Audit",
          userEmail: null,
          action: `audit_plan.${row.status || "updated"}`,
          entityType: "audit_plan",
          entityId: String(row.id),
          entityTitle: row.title || row.audit_number || "Audit plan",
          details: { status: row.status, statusLabel },
          createdAt: row.createdAt,
        });
      }
    }
  } catch {
    // ignore
  }

  const documentActivities: OrgActivityFeedItem[] = [];
  try {
    const docTableCheck = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_module_history'`
    );
    if (docTableCheck.rows.length > 0) {
      const docResult = await client.query(
        `SELECT h.id::text as "historyId",
                h.record_id::text as "recordId",
                h.action,
                h.actor_user_id as "actorUserId",
                h.actor_user_name as "actorUserName",
                h.details,
                h.created_at as "createdAt",
                r.preview_doc_ref as "previewDocRef",
                r.form_data as "formData"
         FROM document_module_history h
         INNER JOIN document_module_records r ON r.id = h.record_id
         ORDER BY h.created_at DESC
         LIMIT $1`,
        [Math.min(25, perSource)]
      );
      for (const row of docResult.rows) {
        const formData = row.formData as Record<string, unknown> | null;
        const titleFromForm =
          formData && typeof formData.title === "string" ? formData.title.trim() : "";
        const entityTitle = titleFromForm || String(row.previewDocRef ?? "").trim() || "Document";
        const rawDetails = row.details;
        const details: Record<string, unknown> =
          typeof rawDetails === "object" && rawDetails !== null && !Array.isArray(rawDetails)
            ? (rawDetails as Record<string, unknown>)
            : {};
        documentActivities.push({
          id: `doc-${row.historyId}`,
          processId: null,
          userId: String(row.actorUserId ?? ""),
          userName: String(row.actorUserName ?? "").trim() || "Someone",
          userEmail: null,
          action: `document.${row.action}`,
          entityType: "document",
          entityId: String(row.recordId),
          entityTitle,
          details,
          createdAt: row.createdAt as string,
        });
      }
    }
  } catch {
    // ignore
  }

  const merged = [...processActivities, ...auditActivities, ...documentActivities].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return merged.slice(0, cap);
}

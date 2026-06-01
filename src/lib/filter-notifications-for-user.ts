import type { PoolClient } from "pg";
import type { OrgActivityFeedItem } from "@/lib/fetch-org-wide-activity-feed";

type IssueParties = {
  assignee: string | null;
  issuer: string | null;
  verifier: string | null;
};

type AuditPlanParties = {
  leadAuditorUserId: string;
  auditeeUserId: string;
  assignedAuditorIds: string[];
};

type DocumentParties = {
  createdByUserId: string;
  processOwnerUserId: string;
  approverUserId: string;
  annualReviewRequestedByUserId: string | null;
};

export type NotificationFilterContext = {
  issuePartiesByEntityId: Map<string, IssueParties>;
  auditPlansByEntityId: Map<string, AuditPlanParties>;
  documentPartiesByRecordId: Map<string, DocumentParties>;
  documentHistoryActionById: Map<string, string>;
  processUserIdsByProcessId: Map<string, Set<string>>;
};

function normalizeId(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

function uniqueIds(ids: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    const n = normalizeId(id);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

function excludeActor(recipientIds: string[], actorUserId: string | null): string[] {
  if (!actorUserId) return recipientIds;
  return recipientIds.filter((id) => id !== actorUserId);
}

/** Document workflow action (without `document.` prefix). */
export function documentNotificationRecipients(
  action: string,
  doc: DocumentParties,
  actorUserId: string | null
): string[] {
  const key = action.startsWith("document.") ? action.slice("document.".length) : action;

  let recipients: string[] = [];
  switch (key) {
    case "submitted_for_review":
    case "revision_created":
      recipients = [doc.processOwnerUserId];
      break;
    case "review_submitted":
      recipients = [doc.approverUserId];
      break;
    case "review_returned_for_correction":
      recipients = [doc.createdByUserId];
      break;
    case "approval_returned_for_correction":
      recipients = [doc.processOwnerUserId];
      break;
    case "approved":
      recipients = [doc.createdByUserId, doc.processOwnerUserId];
      break;
    case "annual_review_requested":
      recipients = [doc.createdByUserId];
      break;
    case "annual_review_accepted":
    case "annual_review_declined":
      recipients = doc.annualReviewRequestedByUserId ? [doc.annualReviewRequestedByUserId] : [];
      break;
    // Draft-only edits are not pushed to other stakeholders.
    case "draft_created":
    case "draft_updated":
    default:
      recipients = [];
  }

  return excludeActor(uniqueIds(recipients), actorUserId);
}

export function auditNotificationRecipients(
  status: string,
  plan: AuditPlanParties,
  _actorUserId: string | null
): string[] {
  const auditors = uniqueIds([plan.leadAuditorUserId, ...plan.assignedAuditorIds]);
  const auditee = normalizeId(plan.auditeeUserId);

  switch (status) {
    case "plan_submitted_to_auditee":
    case "findings_submitted_to_auditee":
    case "verification_ineffective":
      return auditee ? [auditee] : [];
    case "ca_submitted_to_auditor":
      return auditors;
    case "pending_closure":
      return normalizeId(plan.leadAuditorUserId) ? [plan.leadAuditorUserId] : auditors;
    case "closed":
      return uniqueIds([...auditors, auditee]);
    case "draft":
      return auditors;
    default:
      return uniqueIds([...auditors, auditee]);
  }
}

export function issueNotificationRecipients(
  action: string,
  issue: IssueParties,
  details: Record<string, unknown>,
  actorUserId: string | null
): string[] {
  const assignee = normalizeId(issue.assignee) ?? normalizeId(details.assignee);
  const issuer = normalizeId(issue.issuer);
  const verifier = normalizeId(issue.verifier);

  let recipients: string[] = [];
  switch (action) {
    case "issue.created":
      recipients = assignee ? [assignee] : [];
      break;
    case "issue.assigned":
      recipients = uniqueIds([assignee, issuer]);
      break;
    case "issue.status_changed":
    case "issue.updated":
      recipients = uniqueIds([assignee, issuer, verifier]);
      break;
    default:
      recipients = uniqueIds([assignee, issuer, verifier]);
  }

  return excludeActor(uniqueIds(recipients), actorUserId);
}

export function isActivityRelevantToUser(
  activity: OrgActivityFeedItem,
  userId: string,
  ctx: NotificationFilterContext
): boolean {
  const actorUserId = normalizeId(activity.userId);

  if (activity.entityType === "audit_plan" && activity.entityId) {
    const plan = ctx.auditPlansByEntityId.get(activity.entityId);
    if (!plan) return false;
    const status =
      (activity.details?.status as string) ||
      activity.action.replace(/^audit_plan\./, "") ||
      "";
    const recipients = auditNotificationRecipients(status, plan, actorUserId);
    return recipients.includes(userId);
  }

  if (activity.entityType === "document" || activity.action.startsWith("document.")) {
    const recordId = activity.entityId;
    if (!recordId) return false;
    const doc = ctx.documentPartiesByRecordId.get(recordId);
    if (!doc) return false;

    let actionKey = activity.action;
    if (activity.id.startsWith("doc-")) {
      const historyAction = ctx.documentHistoryActionById.get(activity.id.slice(4));
      if (historyAction) actionKey = `document.${historyAction}`;
    }

    const recipients = documentNotificationRecipients(actionKey, doc, actorUserId);
    return recipients.includes(userId);
  }

  if (activity.entityType === "issue" && activity.entityId) {
    const issue = ctx.issuePartiesByEntityId.get(activity.entityId);
    if (!issue) return false;
    const recipients = issueNotificationRecipients(
      activity.action,
      issue,
      activity.details ?? {},
      actorUserId
    );
    return recipients.includes(userId);
  }

  if (activity.action === "sprint.created" && activity.processId) {
    const members = ctx.processUserIdsByProcessId.get(activity.processId);
    if (!members) return false;
    if (actorUserId && actorUserId === userId) return false;
    return members.has(userId);
  }

  if (activity.processId) {
    const members = ctx.processUserIdsByProcessId.get(activity.processId);
    if (!members) return false;
    if (actorUserId && actorUserId === userId) return false;
    return members.has(userId);
  }

  return false;
}

/**
 * Batch-load stakeholder ids for activities so notifications can be filtered per user.
 */
export async function buildNotificationFilterContext(
  client: PoolClient,
  activities: OrgActivityFeedItem[]
): Promise<NotificationFilterContext> {
  const issueIds = uniqueIds(
    activities.filter((a) => a.entityType === "issue" && a.entityId).map((a) => a.entityId)
  );
  const auditPlanIds = uniqueIds(
    activities.filter((a) => a.entityType === "audit_plan" && a.entityId).map((a) => a.entityId)
  );
  const documentRecordIds = uniqueIds(
    activities
      .filter((a) => (a.entityType === "document" || a.action.startsWith("document.")) && a.entityId)
      .map((a) => a.entityId)
  );
  const processIds = uniqueIds(
    activities.filter((a) => a.processId).map((a) => a.processId)
  );

  const issuePartiesByEntityId = new Map<string, IssueParties>();
  const auditPlansByEntityId = new Map<string, AuditPlanParties>();
  const documentPartiesByRecordId = new Map<string, DocumentParties>();
  const documentHistoryActionById = new Map<string, string>();
  const processUserIdsByProcessId = new Map<string, Set<string>>();

  if (issueIds.length > 0) {
    try {
      const issueResult = await client.query<{
        id: string;
        assignee: string | null;
        issuer: string | null;
        verifier: string | null;
      }>(
        `SELECT id::text, assignee, issuer, verifier FROM issues WHERE id::text = ANY($1::text[])`,
        [issueIds]
      );
      for (const row of issueResult.rows) {
        issuePartiesByEntityId.set(row.id, {
          assignee: normalizeId(row.assignee),
          issuer: normalizeId(row.issuer),
          verifier: normalizeId(row.verifier),
        });
      }
    } catch {
      // issues table may lack columns in older tenants
    }
  }

  if (auditPlanIds.length > 0) {
    try {
      const tableCheck = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_plans'`
      );
      if (tableCheck.rows.length > 0) {
        const auditResult = await client.query<{
          id: string;
          lead_auditor_user_id: string;
          auditee_user_id: string;
        }>(
          `SELECT id::text, lead_auditor_user_id::text, auditee_user_id::text
           FROM audit_plans WHERE id::text = ANY($1::text[])`,
          [auditPlanIds]
        );
        const assignmentsByPlan = new Map<string, string[]>();
        const assignResult = await client.query<{ audit_plan_id: string; user_id: string }>(
          `SELECT audit_plan_id::text, user_id::text
           FROM audit_plan_assignments WHERE audit_plan_id::text = ANY($1::text[])`,
          [auditPlanIds]
        );
        for (const row of assignResult.rows) {
          const list = assignmentsByPlan.get(row.audit_plan_id) ?? [];
          list.push(row.user_id);
          assignmentsByPlan.set(row.audit_plan_id, list);
        }
        for (const row of auditResult.rows) {
          auditPlansByEntityId.set(row.id, {
            leadAuditorUserId: row.lead_auditor_user_id,
            auditeeUserId: row.auditee_user_id,
            assignedAuditorIds: assignmentsByPlan.get(row.id) ?? [],
          });
        }
      }
    } catch {
      // ignore
    }
  }

  if (documentRecordIds.length > 0) {
    try {
      const docTableCheck = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_module_records'`
      );
      if (docTableCheck.rows.length > 0) {
        const docResult = await client.query<{
          id: string;
          form_data: Record<string, unknown> | null;
          created_by_user_id: string | null;
        }>(
          `SELECT id::text, form_data, created_by_user_id::text
           FROM document_module_records WHERE id::text = ANY($1::text[])`,
          [documentRecordIds]
        );
        for (const row of docResult.rows) {
          const form = row.form_data ?? {};
          const annual = form.annualReviewRevalidation as Record<string, unknown> | undefined;
          documentPartiesByRecordId.set(row.id, {
            createdByUserId:
              normalizeId(form.createdByUserId) ?? normalizeId(row.created_by_user_id) ?? "",
            processOwnerUserId: normalizeId(form.processOwnerUserId) ?? "",
            approverUserId: normalizeId(form.approverUserId) ?? "",
            annualReviewRequestedByUserId: normalizeId(annual?.requestedByUserId),
          });
        }
      }

      const historyIds = activities
        .filter((a) => a.id.startsWith("doc-"))
        .map((a) => a.id.slice(4))
        .filter(Boolean);
      if (historyIds.length > 0) {
        const historyResult = await client.query<{ id: string; action: string }>(
          `SELECT id::text, action FROM document_module_history WHERE id::text = ANY($1::text[])`,
          [historyIds]
        );
        for (const row of historyResult.rows) {
          documentHistoryActionById.set(row.id, row.action);
        }
      }
    } catch {
      // ignore
    }
  }

  if (processIds.length > 0) {
    try {
      const puResult = await client.query<{ process_id: string; user_id: string }>(
        `SELECT process_id::text, user_id::text FROM process_users WHERE process_id::text = ANY($1::text[])`,
        [processIds]
      );
      for (const row of puResult.rows) {
        const set = processUserIdsByProcessId.get(row.process_id) ?? new Set<string>();
        set.add(row.user_id);
        processUserIdsByProcessId.set(row.process_id, set);
      }
    } catch {
      // ignore
    }
  }

  return {
    issuePartiesByEntityId,
    auditPlansByEntityId,
    documentPartiesByRecordId,
    documentHistoryActionById,
    processUserIdsByProcessId,
  };
}

export function filterActivitiesForUser(
  activities: OrgActivityFeedItem[],
  userId: string,
  ctx: NotificationFilterContext
): OrgActivityFeedItem[] {
  return activities.filter((activity) => isActivityRelevantToUser(activity, userId, ctx));
}

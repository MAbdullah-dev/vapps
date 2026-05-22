import { COMPLIANCE_KPI_THRESHOLDS, getComplianceKpiFromDays, getDaysSince } from "@/lib/compliance-kpi";

export type OrgKpiStatus = "on-track" | "at-risk";

export type OrgKpiMetric = {
  id: string;
  name: string;
  target: string;
  current: string;
  status: OrgKpiStatus;
};

export type OrgKpiMetricsPayload = {
  kpis: OrgKpiMetric[];
  computedAt: string;
};

const ISSUE_RESOLUTION_TARGET_HOURS = 48;
const COMPLETION_TARGET_PERCENT = 90;
const AUDIT_COMPLETION_TARGET_PERCENT = 95;
const DOCUMENT_COMPLIANCE_TARGET_PERCENT = 95;

export function formatHours(hours: number | null): string {
  if (hours == null || Number.isNaN(hours)) return "—";
  if (hours < 24) return `${Math.round(hours)} hours`;
  const days = hours / 24;
  if (days < 10) return `${days.toFixed(1)} days`;
  return `${Math.round(days)} days`;
}

export function formatPercent(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${Math.round(value)}%`;
}

export function buildOrgKpiMetrics(data: {
  avgIssueResolutionHours: number | null;
  issueCompletionPercent: number | null;
  auditCompletionPercent: number | null;
  documentCompliancePercent: number | null;
  avgIssueKpiScore: number | null;
}): OrgKpiMetric[] {
  const issueResolutionOnTrack =
    data.avgIssueResolutionHours != null &&
    data.avgIssueResolutionHours <= ISSUE_RESOLUTION_TARGET_HOURS;

  const issueCompletionOnTrack =
    data.issueCompletionPercent != null &&
    data.issueCompletionPercent >= COMPLETION_TARGET_PERCENT;

  const auditCompletionOnTrack =
    data.auditCompletionPercent != null &&
    data.auditCompletionPercent >= AUDIT_COMPLETION_TARGET_PERCENT;

  const documentComplianceOnTrack =
    data.documentCompliancePercent != null &&
    data.documentCompliancePercent >= DOCUMENT_COMPLIANCE_TARGET_PERCENT;

  const satisfactionPercent =
    data.avgIssueKpiScore != null
      ? Math.round((data.avgIssueKpiScore / 3) * 100)
      : data.issueCompletionPercent;

  const satisfactionOnTrack =
    satisfactionPercent != null && satisfactionPercent >= COMPLETION_TARGET_PERCENT;

  return [
    {
      id: "issue-resolution",
      name: "Issue Resolution Time",
      target: `< ${ISSUE_RESOLUTION_TARGET_HOURS} hours`,
      current: formatHours(data.avgIssueResolutionHours),
      status: issueResolutionOnTrack ? "on-track" : "at-risk",
    },
    {
      id: "customer-satisfaction",
      name: "Issue Quality Score",
      target: `> ${COMPLETION_TARGET_PERCENT}%`,
      current:
        data.avgIssueKpiScore != null
          ? `${formatPercent(satisfactionPercent)} (avg ${data.avgIssueKpiScore.toFixed(1)}/3)`
          : formatPercent(data.issueCompletionPercent),
      status: satisfactionOnTrack ? "on-track" : "at-risk",
    },
    {
      id: "audit-completion",
      name: "Audit Completion Rate",
      target: `≥ ${AUDIT_COMPLETION_TARGET_PERCENT}%`,
      current: formatPercent(data.auditCompletionPercent),
      status: auditCompletionOnTrack ? "on-track" : "at-risk",
    },
    {
      id: "document-compliance",
      name: "Document Compliance",
      target: `≥ ${DOCUMENT_COMPLIANCE_TARGET_PERCENT}%`,
      current: formatPercent(data.documentCompliancePercent),
      status: documentComplianceOnTrack ? "on-track" : "at-risk",
    },
  ];
}

/** Share documentary evidence rows into consistent % using org KPI day thresholds. */
export function documentaryEvidenceCompliancePercent(
  rows: { created_at: string | Date | null }[]
): number | null {
  if (rows.length === 0) return null;
  let consistent = 0;
  for (const row of rows) {
    const days = getDaysSince(row.created_at);
    const { kpiLabel } = getComplianceKpiFromDays(days);
    if (kpiLabel === "Consistent") consistent += 1;
  }
  return Math.round((consistent / rows.length) * 100);
}

export { COMPLIANCE_KPI_THRESHOLDS };

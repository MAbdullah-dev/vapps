export const COMPLIANCE_KPI_THRESHOLDS = {
  pendingDays: 30,
  failDays: 40,
} as const;

export type ComplianceKpiLabel = "Consistent" | "Pending" | "Inconsistent";
export type ComplianceStatusLabel = "Success" | "Pending" | "Fail" | "In-Progress";

export type ComplianceKpiResult = {
  kpiLabel: ComplianceKpiLabel;
  statusLabel: ComplianceStatusLabel;
  kpiColorClass: string;
  statusBadgeClass: string;
};

const MS_PER_DAY = 86400000;

export function getDaysSince(referenceDate: Date | string | null | undefined): number {
  if (!referenceDate) return 0;
  const refTime = new Date(referenceDate).getTime();
  if (Number.isNaN(refTime)) return 0;
  return Math.floor((Date.now() - refTime) / MS_PER_DAY);
}

export function getDaysBetween(
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined
): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.floor((end - start) / MS_PER_DAY));
}

export function getComplianceKpiFromDays(
  days: number,
  options?: { closed?: boolean; inProgress?: boolean }
): ComplianceKpiResult {
  const { pendingDays, failDays } = COMPLIANCE_KPI_THRESHOLDS;

  if (options?.closed) {
    return {
      kpiLabel: "Consistent",
      statusLabel: "Success",
      kpiColorClass: "text-primary",
      statusBadgeClass: "bg-primary",
    };
  }

  if (options?.inProgress && days < pendingDays) {
    return {
      kpiLabel: "Consistent",
      statusLabel: "In-Progress",
      kpiColorClass: "text-primary",
      statusBadgeClass: "bg-amber-600",
    };
  }

  if (days > failDays) {
    return {
      kpiLabel: "Inconsistent",
      statusLabel: "Fail",
      kpiColorClass: "text-destructive",
      statusBadgeClass: "bg-destructive",
    };
  }

  if (days > pendingDays) {
    return {
      kpiLabel: "Pending",
      statusLabel: "Pending",
      kpiColorClass: "text-amber-600 dark:text-amber-400",
      statusBadgeClass: "bg-amber-600",
    };
  }

  return {
    kpiLabel: "Consistent",
    statusLabel: "Success",
    kpiColorClass: "text-primary",
    statusBadgeClass: "bg-primary",
  };
}

export function getComplianceKpiFromReferenceDate(
  referenceDate: Date | string | null | undefined,
  options?: { closed?: boolean; inProgress?: boolean }
): ComplianceKpiResult {
  const days = getDaysSince(referenceDate);
  return getComplianceKpiFromDays(days, options);
}

/** Map stored integer kpiScore (1–3) to label. */
export function kpiScoreToLabel(score: number | null | undefined): ComplianceKpiLabel | null {
  if (score == null || score <= 0) return null;
  if (score >= 3) return "Consistent";
  if (score >= 2) return "Pending";
  return "Inconsistent";
}

/** Map label to integer kpiScore for DB storage. */
export function kpiLabelToScore(label: ComplianceKpiLabel): number {
  if (label === "Consistent") return 3;
  if (label === "Pending") return 2;
  return 1;
}

export function getComplianceKpiForIssue(
  issue: {
    status?: string;
    createdAt?: string | null;
    deadline?: string | null;
    kpiScore?: number | null;
    closeOutDate?: string | null;
    verificationDate?: string | null;
  }
): ComplianceKpiResult {
  const isDone = issue.status === "done";

  if (isDone) {
    const storedLabel = kpiScoreToLabel(issue.kpiScore);
    if (storedLabel) {
      const base = getComplianceKpiFromDays(0, { closed: true });
      return { ...base, kpiLabel: storedLabel };
    }
    const end = issue.closeOutDate || issue.verificationDate;
    const days = getDaysBetween(issue.createdAt, end);
    return getComplianceKpiFromDays(days, { closed: days <= COMPLIANCE_KPI_THRESHOLDS.pendingDays });
  }

  if (issue.deadline) {
    const daysToDeadline = getDaysBetween(new Date(), issue.deadline);
    const daysOverdue = getDaysSince(issue.deadline);
    if (daysOverdue > 0) {
      return getComplianceKpiFromDays(daysOverdue);
    }
    const daysOpen = getDaysSince(issue.createdAt);
    const totalSpan = getDaysBetween(issue.createdAt, issue.deadline) || 1;
    const ratio = daysOpen / totalSpan;
    if (ratio > 0.8) return getComplianceKpiFromDays(COMPLIANCE_KPI_THRESHOLDS.pendingDays + 1);
    return getComplianceKpiFromDays(0, { inProgress: true });
  }

  const days = getDaysSince(issue.createdAt);
  return getComplianceKpiFromDays(days, { inProgress: days < COMPLIANCE_KPI_THRESHOLDS.pendingDays });
}

export function calculateIssueKpiScore(
  createdAt: string | null | undefined,
  deadline: string | null | undefined,
  closeOutDate: string | null | undefined
): number {
  if (closeOutDate && deadline) {
    const daysToClose = getDaysBetween(createdAt, closeOutDate);
    const allowedDays = getDaysBetween(createdAt, deadline);
    if (allowedDays > 0 && daysToClose <= allowedDays) return 3;
    if (daysToClose <= allowedDays + COMPLIANCE_KPI_THRESHOLDS.pendingDays) return 2;
    return 1;
  }
  if (closeOutDate) {
    const days = getDaysBetween(createdAt, closeOutDate);
    const kpi = getComplianceKpiFromDays(days, {
      closed: days <= COMPLIANCE_KPI_THRESHOLDS.pendingDays,
    });
    return kpiLabelToScore(kpi.kpiLabel);
  }
  return 3;
}

/** Audit-specific long status labels (backward compatible). */
export const AUDIT_STATUS_LABELS = {
  success: "Success ≤ 30 days",
  inProgress: "In-Progress < 30 days",
  pending: "Pending > 30 days",
  fail: "Fail > 40 days",
} as const;

export function getAuditStatusByDays(
  planStatus: string,
  plannedDate: string | null,
  datePrepared: string | null,
  createdAt: string | null
): string {
  const refDate = plannedDate || datePrepared || createdAt;
  const days = getDaysSince(refDate);

  if (planStatus === "closed") return AUDIT_STATUS_LABELS.success;

  const inProgress = [
    "plan_submitted_to_auditee",
    "findings_submitted_to_auditee",
    "ca_submitted_to_auditor",
    "pending_closure",
    "verification_ineffective",
  ].includes(planStatus);

  if (inProgress || planStatus === "draft") {
    if (days < COMPLIANCE_KPI_THRESHOLDS.pendingDays) return AUDIT_STATUS_LABELS.inProgress;
    if (days <= COMPLIANCE_KPI_THRESHOLDS.failDays) return AUDIT_STATUS_LABELS.pending;
    return AUDIT_STATUS_LABELS.fail;
  }

  if (days < COMPLIANCE_KPI_THRESHOLDS.pendingDays) return AUDIT_STATUS_LABELS.inProgress;
  if (days <= COMPLIANCE_KPI_THRESHOLDS.failDays) return AUDIT_STATUS_LABELS.pending;
  return AUDIT_STATUS_LABELS.fail;
}

export function getAuditComplianceKpi(
  planStatus: string,
  plannedDate: string | null,
  datePrepared: string | null,
  createdAt: string | null
): ComplianceKpiResult {
  const refDate = plannedDate || datePrepared || createdAt;
  const days = getDaysSince(refDate);
  const closed = planStatus === "closed";
  const inProgress = [
    "plan_submitted_to_auditee",
    "findings_submitted_to_auditee",
    "ca_submitted_to_auditor",
    "pending_closure",
    "verification_ineffective",
    "draft",
  ].includes(planStatus);
  return getComplianceKpiFromDays(days, { closed, inProgress: inProgress && !closed });
}

export function getAuditStatusColor(status: string): string {
  if (status === AUDIT_STATUS_LABELS.success) return "bg-primary/15 text-primary dark:bg-primary/25";
  if (status === AUDIT_STATUS_LABELS.inProgress) return "bg-yellow-100 text-yellow-800";
  if (status === AUDIT_STATUS_LABELS.pending) return "bg-gray-100 text-gray-800";
  if (status === AUDIT_STATUS_LABELS.fail) return "bg-red-100 text-red-700";
  return "";
}

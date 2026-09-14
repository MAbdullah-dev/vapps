/** Leadership tier from `/api/organization/[orgId]/me` — Support staff run capture for F-records. */
export function isSupportLeadershipTier(tier: string | null | undefined): boolean {
  return String(tier ?? "").trim().toLowerCase() === "support";
}

/** Verifier pool: Top + Operational leadership (mid-level verification). */
export function isTopOrOperationalLeadershipTier(tier: string | null | undefined): boolean {
  const t = String(tier ?? "").trim().toLowerCase();
  return t === "top" || t === "operational";
}

/** Support staff create and submit capture; Top and Operational may open the Capture screen. */
export function canViewDocumentaryEvidenceWorkflow(tier: string | null | undefined): boolean {
  return isSupportLeadershipTier(tier) || isTopOrOperationalLeadershipTier(tier);
}

/**
 * Documentary capture is a Support Leadership workflow (Coordinator, Supervisor, Team Lead).
 * Job title is the source of truth: leftover Auditor additional-role rows on Member users
 * must not block capture (those users cannot be assigned Auditor in Edit User).
 */
export function canPerformSupportLeadershipCapture(
  tier: string | null | undefined,
  _additionalRoleNames?: string[] | null
): boolean {
  return isSupportLeadershipTier(tier);
}

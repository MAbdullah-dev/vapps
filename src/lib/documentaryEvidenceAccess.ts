import {
  AUDITOR_ADDITIONAL_ROLE_NAME,
  normalizeAdditionalRoleName,
} from "@/lib/auditor-leadership-policy";

/** Leadership tier from `/api/organization/[orgId]/me` — Support staff run capture for F-records. */
export function isSupportLeadershipTier(tier: string | null | undefined): boolean {
  return String(tier ?? "").trim().toLowerCase() === "support";
}

/** Verifier pool: Top + Operational leadership (mid-level verification). */
export function isTopOrOperationalLeadershipTier(tier: string | null | undefined): boolean {
  const t = String(tier ?? "").trim().toLowerCase();
  return t === "top" || t === "operational";
}

/** Support or Top/Operational — can load workflow status and evidence APIs for documentary evidence. */
export function canViewDocumentaryEvidenceWorkflow(tier: string | null | undefined): boolean {
  return isSupportLeadershipTier(tier) || isTopOrOperationalLeadershipTier(tier);
}

const auditorNorm = normalizeAdditionalRoleName(AUDITOR_ADDITIONAL_ROLE_NAME);

/**
 * Documentary capture is a Support Leadership workflow step; internal auditors must not combine with that access.
 */
export function canPerformSupportLeadershipCapture(
  tier: string | null | undefined,
  additionalRoleNames?: string[] | null
): boolean {
  if (!isSupportLeadershipTier(tier)) return false;
  const hasAuditor = (additionalRoleNames ?? []).some(
    (n) => normalizeAdditionalRoleName(n) === auditorNorm
  );
  return !hasAuditor;
}

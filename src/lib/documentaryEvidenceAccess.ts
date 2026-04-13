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

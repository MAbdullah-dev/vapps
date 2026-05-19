/**
 * Organization settings (workspace configuration) are restricted to Level 1 users:
 * Top Leadership tier (leadershipLevel 1 / Admin) and organization owners.
 */

/** Leadership tier from `/api/organization/[orgId]/me` — Level 1 = Top. */
export function isTopLeadershipTier(tier: string | null | undefined): boolean {
  return String(tier ?? "").trim().toLowerCase() === "top";
}

export function canAccessOrgSettings(
  leadershipTier: string | null | undefined,
  isOwner?: boolean
): boolean {
  return isTopLeadershipTier(leadershipTier) || isOwner === true;
}

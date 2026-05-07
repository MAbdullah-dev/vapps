/** Name of the seeded/custom additional role used for audit workflows. */
export const AUDITOR_ADDITIONAL_ROLE_NAME = "Auditor";

export function normalizeAdditionalRoleName(name: string): string {
  return String(name ?? "").trim().toLowerCase();
}

/** Member (Level 3 / Support Leadership job titles) cannot be assigned the Auditor additional role. */
export function isAuditorRoleName(name: string): boolean {
  return normalizeAdditionalRoleName(name) === normalizeAdditionalRoleName(AUDITOR_ADDITIONAL_ROLE_NAME);
}

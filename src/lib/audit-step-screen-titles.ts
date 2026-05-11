/**
 * Short step names (same strings as the audit workflow header tabs).
 * Use with `t(...)` from `useTranslate()` everywhere that label appears.
 */
export const AUDIT_STEP_SHORT_LABEL = {
  1: "Managing Audit Program",
  2: "Audit Plan",
  3: "Audit Findings",
  4: "Corrective Action",
  5: "Verification",
  6: "Closure",
} as const;

export type AuditCreateStepNumber = keyof typeof AUDIT_STEP_SHORT_LABEL;

/** Primary hero line per create step; English key for `t()`. */
export const AUDIT_STEP_HERO: Record<AuditCreateStepNumber, string> = {
  1: `STEP 1 OF 6: ${AUDIT_STEP_SHORT_LABEL[1]}`,
  2: `STEP 2 OF 6: ${AUDIT_STEP_SHORT_LABEL[2]}`,
  3: `STEP 3 OF 6: ${AUDIT_STEP_SHORT_LABEL[3]}`,
  4: `STEP 4 OF 6: ${AUDIT_STEP_SHORT_LABEL[4]}`,
  5: `STEP 5 OF 6: ${AUDIT_STEP_SHORT_LABEL[5]}`,
  6: `STEP 6 OF 6: ${AUDIT_STEP_SHORT_LABEL[6]}`,
};

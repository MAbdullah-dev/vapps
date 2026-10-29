import { normalizeAuditUploadedFileRef } from "@/components/audit/AuditUploadedFilesList";
import type { AuditNcFinding } from "@/lib/audit-step4-ca";

export type Step5FileRef = { name: string; key: string };
export type VerificationOutcome = "effective" | "ineffective";

export type Step5NcVerification = {
  findingId: string;
  outcome: VerificationOutcome | null;
  auditorComments: string;
  evidenceFiles: Step5FileRef[];
  locked?: boolean;
};

function asFileList(raw: unknown): Step5FileRef[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeAuditUploadedFileRef).filter((i): i is Step5FileRef => i != null);
}

export function emptyStep5Verification(findingId: string): Step5NcVerification {
  return {
    findingId,
    outcome: null,
    auditorComments: "",
    evidenceFiles: [],
    locked: false,
  };
}

function verificationFromRecord(raw: Record<string, unknown>, findingId: string): Step5NcVerification {
  const outcome =
    raw.outcome === "effective" || raw.outcome === "ineffective"
      ? raw.outcome
      : raw.verificationOutcome === "effective" || raw.verificationOutcome === "ineffective"
        ? raw.verificationOutcome
        : null;
  return {
    findingId: typeof raw.findingId === "string" && raw.findingId ? raw.findingId : findingId,
    outcome,
    auditorComments:
      typeof raw.auditorComments === "string"
        ? raw.auditorComments
        : typeof raw.comments === "string"
          ? raw.comments
          : "",
    evidenceFiles: asFileList(raw.evidenceFiles ?? raw.files),
    locked: raw.locked === true,
  };
}

export function parseStep5Verifications(
  step5Data: unknown,
  ncs: AuditNcFinding[]
): Record<string, Step5NcVerification> {
  const map: Record<string, Step5NcVerification> = {};
  for (const nc of ncs) map[nc.id] = emptyStep5Verification(nc.id);
  if (!step5Data || typeof step5Data !== "object") return map;
  const d = step5Data as Record<string, unknown>;
  if (Array.isArray(d.verifications)) {
    for (const item of d.verifications) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const id = typeof rec.findingId === "string" ? rec.findingId : "";
      if (!id || !map[id]) continue;
      map[id] = verificationFromRecord(rec, id);
    }
    return map;
  }
  const legacyOutcome =
    d.verificationOutcome === "effective" || d.verificationOutcome === "ineffective"
      ? d.verificationOutcome
      : null;
  if (legacyOutcome && ncs[0]) {
    map[ncs[0].id] = {
      findingId: ncs[0].id,
      outcome: legacyOutcome,
      auditorComments: typeof d.auditorComments === "string" ? d.auditorComments : "",
      evidenceFiles: asFileList(d.evidenceFiles),
      locked: false,
    };
  }
  return map;
}

export function isStep5VerificationComplete(v: Step5NcVerification): boolean {
  return (v.outcome === "effective" || v.outcome === "ineffective") && v.auditorComments.trim() !== "";
}

export function allNcsVerified(
  ncs: AuditNcFinding[],
  map: Record<string, Step5NcVerification>
): boolean {
  return ncs.length > 0 && ncs.every((nc) => isStep5VerificationComplete(map[nc.id] ?? emptyStep5Verification(nc.id)));
}

export function allNcsEffective(
  ncs: AuditNcFinding[],
  map: Record<string, Step5NcVerification>
): boolean {
  return (
    ncs.length > 0 &&
    ncs.every((nc) => (map[nc.id] ?? emptyStep5Verification(nc.id)).outcome === "effective")
  );
}

export function ineffectiveFindingIds(
  ncs: AuditNcFinding[],
  map: Record<string, Step5NcVerification>
): string[] {
  return ncs
    .filter((nc) => (map[nc.id] ?? emptyStep5Verification(nc.id)).outcome === "ineffective")
    .map((nc) => nc.id);
}

/** After auditee revises returned NCs, those outcomes must be verified again. Effective NCs stay locked. */
export function resetIneffectiveVerifications(
  ncs: AuditNcFinding[],
  map: Record<string, Step5NcVerification>
): Step5NcVerification[] {
  return ncs.map((nc) => {
    const current = map[nc.id] ?? emptyStep5Verification(nc.id);
    if (current.outcome === "ineffective") {
      return emptyStep5Verification(nc.id);
    }
    if (current.outcome === "effective") {
      return { ...current, locked: true };
    }
    return current;
  });
}

export function buildStep5Payload(
  ncs: AuditNcFinding[],
  map: Record<string, Step5NcVerification>,
  verificationStartedAt: string
): Record<string, unknown> {
  const verifications = ncs.map((nc) => map[nc.id] ?? emptyStep5Verification(nc.id));
  const primary = verifications[0];
  const anyIneffective = verifications.some((v) => v.outcome === "ineffective");
  const lockEffective = anyIneffective;
  const stored = verifications.map((v) =>
    lockEffective && v.outcome === "effective" ? { ...v, locked: true } : v
  );
  return {
    version: 2,
    verifications: stored,
    verificationStartedAt,
    verificationOutcome: anyIneffective ? "ineffective" : "effective",
    auditorComments: primary?.auditorComments ?? "",
    evidenceFiles: primary?.evidenceFiles ?? [],
  };
}

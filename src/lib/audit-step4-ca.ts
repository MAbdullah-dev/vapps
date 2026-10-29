import { normalizeAuditUploadedFileRef } from "@/components/audit/AuditUploadedFilesList";

export type Step4FileRef = { name: string; key: string };

export type Step4ActionForm = {
  findingId: string;
  containmentDescription: string;
  responsiblePerson: string;
  targetCompletionDate: string | null;
  rootCauseNarrative: string;
  similarProcessesImpacted: "yes" | "no" | null;
  similarProcessesList: string;
  rootCauseResult: string;
  systemicCorrectiveAction: string;
  rootCauseAnalysis: string;
  correctiveActionPlan: string;
  implementationYesNo: "yes" | "no" | null;
  implementationDetails: string;
  auditeeComments: string;
  auditeeName: string;
  auditeePosition: string;
  dateOfReview: string | null;
  confirmReviewed: boolean;
  riskRatingPostAction: "high" | "medium" | "low" | null;
  riskJustificationPost: string;
  filesS2: Step4FileRef[];
  filesS3: Step4FileRef[];
  filesS6: Step4FileRef[];
  filesS7: Step4FileRef[];
  files41: Step4FileRef[];
  files42: Step4FileRef[];
  files43: Step4FileRef[];
  files45: Step4FileRef[];
  files46: Step4FileRef[];
};

export type AuditNcFinding = {
  id: string;
  status: string;
  standard?: string | null;
  clause?: string | null;
  subclauses?: string | null;
  requirement?: string | null;
  statementOfNonconformity?: string | null;
};

function asFileList(raw: unknown): Step4FileRef[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeAuditUploadedFileRef).filter((i): i is Step4FileRef => i != null);
}

export function emptyStep4Action(findingId: string): Step4ActionForm {
  return {
    findingId,
    containmentDescription: "",
    responsiblePerson: "",
    targetCompletionDate: null,
    rootCauseNarrative: "",
    similarProcessesImpacted: null,
    similarProcessesList: "",
    rootCauseResult: "",
    systemicCorrectiveAction: "",
    rootCauseAnalysis: "",
    correctiveActionPlan: "",
    implementationYesNo: null,
    implementationDetails: "",
    auditeeComments: "",
    auditeeName: "",
    auditeePosition: "",
    dateOfReview: new Date().toISOString(),
    confirmReviewed: false,
    riskRatingPostAction: null,
    riskJustificationPost: "",
    filesS2: [],
    filesS3: [],
    filesS6: [],
    filesS7: [],
    files41: [],
    files42: [],
    files43: [],
    files45: [],
    files46: [],
  };
}

function actionFromRecord(raw: Record<string, unknown>, findingId: string): Step4ActionForm {
  const base = emptyStep4Action(findingId);
  return {
    ...base,
    findingId: typeof raw.findingId === "string" && raw.findingId ? raw.findingId : findingId,
    containmentDescription: typeof raw.containmentDescription === "string" ? raw.containmentDescription : "",
    responsiblePerson: typeof raw.responsiblePerson === "string" ? raw.responsiblePerson : "",
    targetCompletionDate:
      raw.targetCompletionDate != null ? String(raw.targetCompletionDate) : null,
    rootCauseNarrative: typeof raw.rootCauseNarrative === "string" ? raw.rootCauseNarrative : "",
    similarProcessesImpacted:
      raw.similarProcessesImpacted === "yes" || raw.similarProcessesImpacted === "no"
        ? raw.similarProcessesImpacted
        : null,
    similarProcessesList: typeof raw.similarProcessesList === "string" ? raw.similarProcessesList : "",
    rootCauseResult: typeof raw.rootCauseResult === "string" ? raw.rootCauseResult : "",
    systemicCorrectiveAction:
      typeof raw.systemicCorrectiveAction === "string" ? raw.systemicCorrectiveAction : "",
    rootCauseAnalysis: typeof raw.rootCauseAnalysis === "string" ? raw.rootCauseAnalysis : "",
    correctiveActionPlan: typeof raw.correctiveActionPlan === "string" ? raw.correctiveActionPlan : "",
    implementationYesNo:
      raw.implementationYesNo === "yes" || raw.implementationYesNo === "no"
        ? raw.implementationYesNo
        : null,
    implementationDetails: typeof raw.implementationDetails === "string" ? raw.implementationDetails : "",
    auditeeComments: typeof raw.auditeeComments === "string" ? raw.auditeeComments : "",
    auditeeName: typeof raw.auditeeName === "string" ? raw.auditeeName : "",
    auditeePosition: typeof raw.auditeePosition === "string" ? raw.auditeePosition : "",
    dateOfReview: raw.dateOfReview != null ? String(raw.dateOfReview) : base.dateOfReview,
    confirmReviewed: raw.confirmReviewed === true,
    riskRatingPostAction:
      raw.riskRatingPostAction === "high" ||
      raw.riskRatingPostAction === "medium" ||
      raw.riskRatingPostAction === "low"
        ? raw.riskRatingPostAction
        : null,
    riskJustificationPost:
      typeof raw.riskJustificationPost === "string" ? raw.riskJustificationPost : "",
    filesS2: asFileList(raw.filesS2),
    filesS3: asFileList(raw.filesS3),
    filesS6: asFileList(raw.filesS6),
    filesS7: asFileList(raw.filesS7),
    files41: asFileList(raw.files41),
    files42: asFileList(raw.files42),
    files43: asFileList(raw.files43),
    files45: asFileList(raw.files45),
    files46: asFileList(raw.files46),
  };
}

/** Load per-NC actions from step_4_data. Legacy single-form payloads map onto the first NC. */
export function parseStep4Actions(
  step4Data: unknown,
  ncs: AuditNcFinding[]
): Record<string, Step4ActionForm> {
  const map: Record<string, Step4ActionForm> = {};
  for (const nc of ncs) map[nc.id] = emptyStep4Action(nc.id);
  if (!step4Data || typeof step4Data !== "object") return map;
  const d = step4Data as Record<string, unknown>;
  if (Array.isArray(d.actions)) {
    for (const item of d.actions) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const id = typeof rec.findingId === "string" ? rec.findingId : "";
      if (!id || !map[id]) continue;
      map[id] = actionFromRecord(rec, id);
    }
    return map;
  }
  const hasLegacy =
    typeof d.containmentDescription === "string" ||
    typeof d.responsiblePerson === "string" ||
    Array.isArray(d.filesS2);
  if (hasLegacy && ncs[0]) {
    map[ncs[0].id] = actionFromRecord(d, ncs[0].id);
  }
  return map;
}

export function isStep4ActionComplete(action: Step4ActionForm): boolean {
  const dateOk =
    !!action.targetCompletionDate && !Number.isNaN(new Date(action.targetCompletionDate).getTime());
  return (
    action.containmentDescription.trim() !== "" &&
    action.responsiblePerson.trim() !== "" &&
    dateOk &&
    action.filesS2.length > 0 &&
    action.auditeeComments.trim() !== ""
  );
}

export function isMajorNc(status: string | null | undefined): boolean {
  return status === "major_nc";
}

export function isMinorNc(status: string | null | undefined): boolean {
  return status === "minor_nc";
}

export function isNcFinding(status: string | null | undefined): boolean {
  return isMajorNc(status) || isMinorNc(status);
}

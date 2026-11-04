import { addDays, format } from "date-fns";
import { compactSiteCode } from "@/lib/documentRef";
import {
  formatNonconformityRef,
  type AuditProgramRefParts,
} from "@/lib/audit-program-ref";
import { getAuditStatusByDays } from "@/lib/compliance-kpi";
import { isNcFinding, isStep4ActionComplete, type Step4ActionForm } from "@/lib/audit-step4-ca";
import type { Step5NcVerification } from "@/lib/audit-step5-verification";
import type { Step6NcReview } from "@/lib/audit-step6-closure";

export const NC_DUE_DAYS_MAJOR = 30;
export const NC_DUE_DAYS_MINOR = 60;

export type NcMatrixSourceFinding = {
  id: string;
  status: string;
  standard?: string | null;
  clause?: string | null;
  subclauses?: string | null;
  requirement?: string | null;
};

export type NcLifecycle = "open" | "ca_submitted" | "verified" | "closed" | "returned";

export type NcMatrixRow = {
  id: string;
  reference: string;
  standard: string;
  site: string;
  processArea: string;
  clause: string;
  subclauses: string;
  classification: "MA" | "mi";
  classificationLabel: "Major" | "Minor";
  dueDate: string;
  ncStatus: string;
  caComplete: boolean;
  verificationOutcome: "effective" | "ineffective" | null;
  closureOutcome: "effective" | "ineffective" | null;
  lifecycle: NcLifecycle;
};

export type NcMatrixBuildInput = {
  findings: NcMatrixSourceFinding[];
  refParts: AuditProgramRefParts;
  planStatus: string | null;
  plannedDate?: string | null;
  datePrepared?: string | null;
  createdAt?: string | null;
  findingsSubmittedAt?: string | null;
  standardName?: string | null;
  caByFindingId?: Record<string, Step4ActionForm>;
  verificationsByFindingId?: Record<string, Step5NcVerification>;
  reviewsByFindingId?: Record<string, Step6NcReview>;
};

export function ncLifecycle(args: {
  caComplete: boolean;
  verificationOutcome: "effective" | "ineffective" | null;
  closureOutcome: "effective" | "ineffective" | null;
}): NcLifecycle {
  if (args.closureOutcome === "effective") return "closed";
  if (args.closureOutcome === "ineffective" || args.verificationOutcome === "ineffective") {
    return "returned";
  }
  if (args.verificationOutcome === "effective") return "verified";
  if (args.caComplete) return "ca_submitted";
  return "open";
}

export function ncLifecycleLabel(lifecycle: NcLifecycle): string {
  if (lifecycle === "closed") return "Closed";
  if (lifecycle === "returned") return "Returned";
  if (lifecycle === "verified") return "Verified";
  if (lifecycle === "ca_submitted") return "CA submitted";
  return "Open";
}

export function buildNcMatrixRows(input: NcMatrixBuildInput): NcMatrixRow[] {
  const ncRows = input.findings.filter((r) => isNcFinding(r.status));
  const dueSource =
    input.plannedDate ||
    input.findingsSubmittedAt ||
    input.datePrepared ||
    input.createdAt ||
    null;
  const dueStart = dueSource ? new Date(dueSource) : null;
  const dueStartValid = Boolean(dueStart && !Number.isNaN(dueStart.getTime()));
  const processArea = String(input.refParts.process ?? "").trim() || "—";
  const site =
    String(input.refParts.site ?? "").trim() && String(input.refParts.site).trim() !== "—"
      ? compactSiteCode(String(input.refParts.site))
      : "—";

  return ncRows.map((row, index) => {
    const isMajor = row.status === "major_nc";
    const dueDays = isMajor ? NC_DUE_DAYS_MAJOR : NC_DUE_DAYS_MINOR;
    const ca = input.caByFindingId?.[row.id];
    const verification = input.verificationsByFindingId?.[row.id];
    const review = input.reviewsByFindingId?.[row.id];
    const caComplete = ca ? isStep4ActionComplete(ca) : false;
    const verificationOutcome = verification?.outcome ?? null;
    const closureOutcome = review?.outcome ?? null;
    const lifecycle = ncLifecycle({ caComplete, verificationOutcome, closureOutcome });
    const treatClosed = lifecycle === "closed" || (input.planStatus === "closed" && closureOutcome !== "ineffective");
    const ncStatus = getAuditStatusByDays(
      treatClosed ? "closed" : input.planStatus ?? "draft",
      input.plannedDate ?? null,
      input.datePrepared ?? null,
      input.createdAt ?? null
    );
    return {
      id: row.id,
      reference: formatNonconformityRef(input.refParts, index + 1),
      standard: row.standard || input.standardName || "—",
      site,
      processArea,
      clause:
        [row.clause, row.requirement]
          .map((v) => String(v ?? "").trim())
          .filter(Boolean)
          .join(" ") || "—",
      subclauses: row.subclauses || "—",
      classification: isMajor ? "MA" : "mi",
      classificationLabel: isMajor ? "Major" : "Minor",
      dueDate: dueStartValid ? format(addDays(dueStart!, dueDays), "dd-MM-yyyy") : "—",
      ncStatus,
      caComplete,
      verificationOutcome,
      closureOutcome,
      lifecycle,
    };
  });
}

export type NcMatrixClosureCheck = {
  allCaComplete: boolean;
  allVerifiedEffective: boolean;
  allClosedEffective: boolean;
  missingCaIds: string[];
  unverifiedIds: string[];
  incompleteClosureIds: string[];
};

export function evaluateNcMatrixForClosure(
  rows: NcMatrixRow[],
  reviews: Record<string, Step6NcReview>
): NcMatrixClosureCheck {
  const missingCaIds = rows.filter((r) => !r.caComplete).map((r) => r.id);
  const unverifiedIds = rows
    .filter((r) => r.verificationOutcome !== "effective")
    .map((r) => r.id);
  const incompleteClosureIds = rows
    .filter((r) => {
      const review = reviews[r.id];
      return !review || review.outcome == null || review.managementComments.trim() === "";
    })
    .map((r) => r.id);
  const allClosedEffective =
    rows.length > 0 &&
    rows.every((r) => (reviews[r.id]?.outcome ?? r.closureOutcome) === "effective");
  return {
    allCaComplete: missingCaIds.length === 0,
    allVerifiedEffective: unverifiedIds.length === 0,
    allClosedEffective,
    missingCaIds,
    unverifiedIds,
    incompleteClosureIds,
  };
}

export function matrixSnapshotForClosure(
  rows: NcMatrixRow[],
  reviews: Record<string, Step6NcReview>,
  extras: { dateApproved: string; timeApproved: string }
) {
  return {
    closedAt: new Date().toISOString(),
    dateApproved: extras.dateApproved,
    timeApproved: extras.timeApproved,
    totalNcs: rows.length,
    majorClosed: rows.filter(
      (r) => r.classification === "MA" && (reviews[r.id]?.outcome ?? r.closureOutcome) === "effective"
    ).length,
    minorClosed: rows.filter(
      (r) => r.classification === "mi" && (reviews[r.id]?.outcome ?? r.closureOutcome) === "effective"
    ).length,
    rows: rows.map((r) => ({
      findingId: r.id,
      reference: r.reference,
      classification: r.classification,
      dueDate: r.dueDate,
      caComplete: r.caComplete,
      verificationOutcome: r.verificationOutcome,
      closureOutcome: reviews[r.id]?.outcome ?? r.closureOutcome,
      ncStatus: r.ncStatus,
      lifecycle: ncLifecycle({
        caComplete: r.caComplete,
        verificationOutcome: r.verificationOutcome,
        closureOutcome: reviews[r.id]?.outcome ?? r.closureOutcome,
      }),
    })),
  };
}

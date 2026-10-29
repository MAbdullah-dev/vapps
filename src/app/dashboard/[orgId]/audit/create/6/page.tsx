"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { auditTableHref, invalidateAuditCaches } from "@/lib/audit-query-cache";
import { useState, useEffect, useMemo, useRef } from "react";
import { format } from "date-fns";
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  FileCheck,
  MessageSquare,
  Square,
} from "lucide-react";
import AuditWorkflowHeader from "@/components/audit/AuditWorkflowHeader";
import { AuditUploadedFilesList } from "@/components/audit/AuditUploadedFilesList";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { scrollToField } from "@/lib/scroll-to-field";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { useTranslate } from "@/components/providers/translation-provider";
import { AUDIT_STEP_HERO } from "@/lib/audit-step-screen-titles";
import {
  type AuditNcFinding,
  type Step4ActionForm,
  emptyStep4Action,
  isNcFinding,
  parseStep4Actions,
} from "@/lib/audit-step4-ca";
import {
  type Step5NcVerification,
  buildStep5Payload,
  emptyStep5Verification,
  parseStep5Verifications,
  resetIneffectiveVerifications,
} from "@/lib/audit-step5-verification";
import {
  type Step6NcReview,
  allNcsClosureEffective,
  allNcsClosureReviewed,
  buildStep6Payload,
  emptyStep6Review,
  isStep6ReviewComplete,
  parseStep6Reviews,
} from "@/lib/audit-step6-closure";

export default function CreateAuditStep6Page() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslate();
  const orgId = params?.orgId as string;
  const programId = searchParams.get("programId") ?? "";
  const criteria = searchParams.get("criteria") ?? "";
  const auditPlanId = searchParams.get("auditPlanId") ?? "";
  const stepQuery = (() => {
    const p = new URLSearchParams();
    if (programId) p.set("programId", programId);
    if (criteria) p.set("criteria", criteria);
    if (auditPlanId) p.set("auditPlanId", auditPlanId);
    const q = p.toString();
    return q ? `?${q}` : "";
  })();

  const [isLoading, setIsLoading] = useState(!!auditPlanId);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [isLeadAuditor, setIsLeadAuditor] = useState(false);
  const [isAssignedAuditor, setIsAssignedAuditor] = useState(false);
  const [planStatus, setPlanStatus] = useState<string | null>(null);
  const [auditIdDisplay, setAuditIdDisplay] = useState("—");
  const [leadAuditorDisplay, setLeadAuditorDisplay] = useState({ name: "—", role: "—" });
  const [dateApproved, setDateApproved] = useState(() => format(new Date(), "dd-MMM-yyyy"));
  const [timeApproved, setTimeApproved] = useState(() => format(new Date(), "HH:mm"));
  const [stats, setStats] = useState({ total: 0, majorNcs: 0, minorNcs: 0 });
  const [closing, setClosing] = useState(false);

  const [finalDecision, setFinalDecision] = useState<"effective" | "ineffective" | null>(null);
  const [managementComments, setManagementComments] = useState("");
  const [commentsError, setCommentsError] = useState(false);
  const [ncFindings, setNcFindings] = useState<AuditNcFinding[]>([]);
  const [currentNcIndex, setCurrentNcIndex] = useState(0);
  const [caByFindingId, setCaByFindingId] = useState<Record<string, Step4ActionForm>>({});
  const [vByFindingId, setVByFindingId] = useState<Record<string, Step5NcVerification>>({});
  const reviewsRef = useRef<Record<string, Step6NcReview>>({});
  const currentNc = ncFindings[currentNcIndex] ?? null;
  const currentCa = currentNc ? caByFindingId[currentNc.id] ?? emptyStep4Action(currentNc.id) : null;
  const currentVerification = currentNc
    ? vByFindingId[currentNc.id] ?? emptyStep5Verification(currentNc.id)
    : null;

  useEffect(() => {
    if (!orgId || !auditPlanId) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const planRes = await apiClient.getAuditPlan(orgId, auditPlanId);
        if (cancelled || !planRes.plan) {
          if (!cancelled) setIsLoading(false);
          return;
        }
        const plan = planRes.plan;
        if (!cancelled) {
          setCurrentUserRole(plan.currentUserRole ?? null);
          setIsLeadAuditor(Boolean(plan.isLeadAuditor) || plan.currentUserRole === "lead_auditor");
          setIsAssignedAuditor(Boolean(plan.isAssignedAuditor) || plan.currentUserRole === "assigned_auditor");
          setPlanStatus(plan.status ?? null);
          setAuditIdDisplay(plan.auditNumber || plan.id?.slice(0, 8) || "—");
        }
        const membersRes = await apiClient.getMembers(orgId);
        if (!cancelled && membersRes.teamMembers?.length && plan.leadAuditorUserId) {
          const lead = membersRes.teamMembers.find((m: { id: string }) => m.id === plan.leadAuditorUserId);
          const member = lead as { name?: string; email?: string; systemRole?: string } | undefined;
          setLeadAuditorDisplay({
            name: member ? (member.name || member.email || "—") : "—",
            role: member?.systemRole || t("Lead Auditor"),
          });
        }
        let ncs: AuditNcFinding[] = [];
        try {
          const findingsRes = await apiClient.getAuditPlanFindings(orgId, auditPlanId);
          const all = Array.isArray(findingsRes?.findings) ? findingsRes.findings : [];
          ncs = all
            .filter((f: { status?: string; id?: string }) => f?.id && isNcFinding(f.status))
            .map((f: AuditNcFinding & { id: string }) => ({
              id: f.id,
              status: f.status,
              standard: f.standard ?? null,
              clause: f.clause ?? null,
              subclauses: f.subclauses ?? null,
              requirement: f.requirement ?? null,
              statementOfNonconformity: f.statementOfNonconformity ?? null,
            }));
          if (!cancelled) {
            setStats({
              total: all.length,
              majorNcs: ncs.filter((x) => x.status === "major_nc").length,
              minorNcs: ncs.filter((x) => x.status === "minor_nc").length,
            });
          }
        } catch {
          ncs = [];
        }
        if (cancelled) return;
        const parsedCa = parseStep4Actions(plan.step4Data, ncs);
        const parsedV = parseStep5Verifications(plan.step5Data, ncs);
        const parsedR = parseStep6Reviews(plan.step6Data, ncs);
        reviewsRef.current = parsedR;
        setCaByFindingId(parsedCa);
        setVByFindingId(parsedV);
        setNcFindings(ncs);
        setCurrentNcIndex(0);
        const first = ncs[0] ? parsedR[ncs[0].id] : null;
        if (first) {
          setFinalDecision(first.outcome);
          setManagementComments(first.managementComments ?? "");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [orgId, auditPlanId, t]);

  const applyReviewToForm = (r: Step6NcReview) => {
    setFinalDecision(r.outcome);
    setManagementComments(r.managementComments ?? "");
    setCommentsError(false);
  };

  const collectReviewFromForm = (findingId: string): Step6NcReview => ({
    findingId,
    outcome: finalDecision,
    managementComments,
    locked: reviewsRef.current[findingId]?.locked === true,
  });

  const flushCurrentReview = () => {
    if (!currentNc) return collectReviewFromForm("legacy");
    const collected = collectReviewFromForm(currentNc.id);
    reviewsRef.current = { ...reviewsRef.current, [currentNc.id]: collected };
    return collected;
  };

  const goToNc = (index: number) => {
    if (index < 0 || index >= ncFindings.length || index === currentNcIndex) return;
    flushCurrentReview();
    setCurrentNcIndex(index);
    const nc = ncFindings[index];
    applyReviewToForm(reviewsRef.current[nc.id] ?? emptyStep6Review(nc.id));
  };

  const currentReviewLocked = Boolean(currentNc && reviewsRef.current[currentNc.id]?.locked);

  const canEditStep6 =
    planStatus !== "closed" && isLeadAuditor && (planStatus == null || planStatus === "pending_closure");
  const canEditCurrentNc = canEditStep6 && !currentReviewLocked;

  const lockedSteps = useMemo(() => {
    if (!planStatus || !currentUserRole) return [];
    const locked: number[] = [];
    if (isLeadAuditor && !["pending_closure", "closed"].includes(planStatus)) locked.push(6);
    if (isAssignedAuditor && !["ca_submitted_to_auditor", "pending_closure", "closed"].includes(planStatus)) locked.push(5);
    return locked;
  }, [planStatus, currentUserRole, isLeadAuditor, isAssignedAuditor]);

  return (
    <div className="space-y-6 [&_.text-gray-900]:text-foreground [&_.text-gray-800]:text-foreground [&_.text-gray-700]:text-foreground [&_.text-gray-600]:text-muted-foreground [&_.text-gray-500]:text-muted-foreground [&_.text-gray-400]:text-muted-foreground/80 [&_.text-gray-300]:text-muted-foreground/70 [&_.border-gray-200]:border-border [&_.border-gray-300]:border-input [&_.bg-gray-50]:bg-muted [&_.bg-gray-100]:bg-muted">
      <AuditWorkflowHeader currentStep={6} orgId={orgId} allowedSteps={[1, 2, 3, 4, 5, 6]} lockedSteps={lockedSteps} stepQuery={stepQuery || undefined}  />
      {!canEditStep6 && currentUserRole != null && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {planStatus === "closed"
            ? t("View only — this audit is complete; no edits allowed.")
            : t("View only — only the Lead Auditor can edit this step.")}
        </div>
      )}
      <div className="rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className={cn(!canEditCurrentNc && "pointer-events-none select-none opacity-90")}>
        {/* Header - Audit Final Closure */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-primary/20 bg-primary/5 text-primary">
            <FileCheck className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-foreground">
            {t(AUDIT_STEP_HERO[6])}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("Audit ID:")}{" "}
            <span className="font-semibold text-primary">{isLoading ? t("…") : auditIdDisplay}</span>
            {" • "}
            {t("ISO 19011:2026 Compliant")}
          </p>
        </div>

        {ncFindings.length === 0 && !isLoading && (
          <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            {t("No Major or Minor nonconformities were recorded. Closure still requires a final decision.")}
          </div>
        )}
        {ncFindings.length > 0 && currentNc && (
          <div className="mt-8 rounded-lg border border-border bg-muted/40 p-5 text-left">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t("Closure review")} {currentNcIndex + 1} {t("of")} {ncFindings.length}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 text-xs font-bold uppercase",
                      currentNc.status === "major_nc" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
                    )}
                  >
                    {currentNc.status === "major_nc" ? t("Major MA") : t("Minor mi")}
                  </span>
                  {currentReviewLocked && (
                    <span className="rounded bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                      {t("Closed effective — locked")}
                    </span>
                  )}
                  <span className="text-sm font-semibold text-foreground">{currentNc.standard || t("—")}</span>
                </div>
                <p className="text-sm text-foreground">
                  <span className="font-semibold">{t("Clause")}:</span> {currentNc.clause || t("—")}
                  {currentNc.subclauses ? ` · ${currentNc.subclauses}` : ""}
                </p>
                {currentNc.statementOfNonconformity ? (
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">{t("Statement of NC")}:</span> {currentNc.statementOfNonconformity}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-2 pointer-events-auto">
                <Button type="button" variant="outline" size="sm" disabled={currentNcIndex === 0} onClick={() => goToNc(currentNcIndex - 1)}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  {t("Previous NC")}
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={currentNcIndex >= ncFindings.length - 1} onClick={() => goToNc(currentNcIndex + 1)}>
                  {t("Next NC")}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
            {ncFindings.length > 1 && (
              <div className="mt-4 flex flex-wrap gap-2 pointer-events-auto">
                {ncFindings.map((nc, i) => {
                  const r =
                    i === currentNcIndex
                      ? collectReviewFromForm(nc.id)
                      : reviewsRef.current[nc.id] ?? emptyStep6Review(nc.id);
                  return (
                    <button
                      key={nc.id}
                      type="button"
                      onClick={() => goToNc(i)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-semibold",
                        i === currentNcIndex
                          ? "border-primary bg-primary text-primary-foreground"
                          : r.outcome === "effective"
                            ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                            : r.outcome === "ineffective"
                              ? "border-red-500 bg-red-50 text-red-800"
                              : "border-border bg-background text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {nc.status === "major_nc" ? "MA" : "mi"} {i + 1}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="space-y-2 rounded-lg border border-border bg-card p-4 text-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("Corrective action")}</p>
                <p><span className="font-semibold">{t("Responsible person")}:</span> {currentCa?.responsiblePerson || t("—")}</p>
                <p><span className="font-semibold">{t("Containment")}:</span> {currentCa?.containmentDescription || t("—")}</p>
                <AuditUploadedFilesList
                  files={currentCa ? [...currentCa.filesS2, ...currentCa.filesS3, ...currentCa.filesS6, ...currentCa.filesS7] : []}
                  className="pointer-events-auto"
                />
              </div>
              <div className="space-y-2 rounded-lg border border-border bg-card p-4 text-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("Verification (Step 5)")}</p>
                <p>
                  <span className="font-semibold">{t("Outcome")}:</span>{" "}
                  {currentVerification?.outcome === "effective"
                    ? t("Effective")
                    : currentVerification?.outcome === "ineffective"
                      ? t("Ineffective")
                      : t("—")}
                </p>
                <p><span className="font-semibold">{t("Auditor comments")}:</span> {currentVerification?.auditorComments || t("—")}</p>
                <AuditUploadedFilesList files={currentVerification?.evidenceFiles ?? []} className="pointer-events-auto" />
              </div>
            </div>
          </div>
        )}

        {/* Management Final Decision & Management Comments - two columns */}
        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Left: Management Final Decision */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
              {t("MANAGEMENT FINAL DECISION")}
            </h2>
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFinalDecision("effective")}
                className={cn(
                  "h-auto w-full flex items-start justify-start gap-4 rounded-lg border-2 p-4 text-left transition-colors whitespace-normal",
                  finalDecision === "effective"
                    ? "border-primary bg-primary/10 hover:bg-primary/15"
                    : "border-border bg-card hover:border-border"
                )}
              >
                {finalDecision === "effective" ? (
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                ) : (
                  <Square className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                )}
                <div>
                  <p className="font-bold text-foreground">
                    {t("Effective — this nonconformity")}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {t("Corrective action and verification are accepted for this NC.")}
                  </p>
                </div>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFinalDecision("ineffective")}
                className={cn(
                  "h-auto w-full flex items-start justify-start gap-4 rounded-lg border-2 p-4 text-left transition-colors whitespace-normal",
                  finalDecision === "ineffective"
                    ? "border-primary bg-primary/10 hover:bg-primary/15"
                    : "border-border bg-card hover:border-border"
                )}
              >
                {finalDecision === "ineffective" ? (
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                ) : (
                  <Square className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                )}
                <div>
                  <p className="font-bold text-foreground">
                    {t("Ineffective — return this NC")}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {t("This nonconformity goes back to the auditee. Effective NCs stay closed.")}
                  </p>
                </div>
              </Button>
            </div>
          </div>

          {/* Right: Management Comments */}
          <div id="audit-field-managementComments" className="space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 shrink-0 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
                {t("MANAGEMENT COMMENTS")} <span className="text-destructive" aria-hidden>*</span>
              </h2>
            </div>
            <Textarea
              placeholder={t(
                "Executive summary of the audit cycle and final approval notes..."
              )}
              className={cn(
                "min-h-44 rounded-lg border-border bg-background italic placeholder:text-muted-foreground",
                managementComments ? "text-foreground" : "text-muted-foreground",
                commentsError && "border-destructive focus-visible:ring-destructive"
              )}
              rows={8}
              value={managementComments}
              onChange={(e) => {
                setManagementComments(e.target.value);
                if (commentsError) setCommentsError(false);
              }}
            />
            {commentsError && <p className="text-xs text-destructive">{t("This field is required")}</p>}
          </div>
        </div>

        {/* Authentication & Seal */}
        <div className="mt-10 space-y-4 bg-accent rounded-xl p-6">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 shrink-0 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
              {t("AUTHENTICATION & SEAL")}
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t(
              "By closing this audit, the management confirms that the audit process was conducted in accordance with the established program and ISO 19011:2026 guidelines."
            )}
          </p>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
            <div className="flex flex-1 gap-8">
              <div className="bg-card rounded-lg p-4 border border-border">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t("APPROVED BY (LEAD AUDITOR)")}
                </p>
                <p className="mt-1 font-bold text-foreground">{isLoading ? t("…") : leadAuditorDisplay.name}</p>
                <p className="text-sm text-muted-foreground">
                  {isLoading ? t("…") : leadAuditorDisplay.role}
                </p>
              </div>
              <div className="bg-card rounded-lg p-4 border border-border">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t("DATE APPROVED")}
                </p>
                <p className="mt-1 font-bold text-foreground">{dateApproved}</p>
                <p className="text-sm text-muted-foreground">{timeApproved}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center justify-center">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-primary/20 bg-primary/10 p-1">
                <span
                  className="block max-w-[80px] text-center text-[9px] font-medium uppercase leading-tight text-muted-foreground"
                  style={{ transform: "rotate(-45deg)" }}
                >
                  {t("VIE OFFICIAL SEAL")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Statistics - 3 cards (from findings) */}
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-muted px-6 py-5 md:flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("TOTAL FINDINGS")}
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">{isLoading ? t("…") : stats.total}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted px-6 py-5 md:flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("MAJOR NCS CLOSED")}
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">{isLoading ? t("…") : stats.majorNcs}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted px-6 py-5 md:flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("MINOR NCS CLOSED")}
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">{isLoading ? t("…") : stats.minorNcs}</p>
          </div>
        </div>
      </div>
      </div>

      {/* Step navigation */}
      <div className="flex items-center justify-between px-6 py-4">
        {/* <Button
          variant="outline"
          className="border-gray-300 text-gray-600 hover:bg-gray-50"
          asChild
        >
          <Link
            href={`${getDashboardPath(orgId, "audit/create/5")}${stepQuery}`}
            className="inline-flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous Step
          </Link>
        </Button> */}
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90 ml-auto"
          disabled={closing || !canEditStep6}
          onClick={async () => {
            if (!currentReviewLocked) {
              if (finalDecision !== "effective" && finalDecision !== "ineffective") {
                toast.error(t("Mark this nonconformity as Effective or Ineffective."));
                return;
              }
              if (managementComments.trim() === "") {
                setCommentsError(true);
                scrollToField("audit-field-managementComments");
                toast.error(t("Please fill in all required fields."));
                return;
              }
            }
            setCommentsError(false);
            if (!orgId || !auditPlanId) {
              toast.error(t("Open this step from a submitted audit plan."));
              return;
            }
            flushCurrentReview();
            if (ncFindings.length > 0) {
              const incomplete = ncFindings.findIndex(
                (nc) => !isStep6ReviewComplete(reviewsRef.current[nc.id] ?? emptyStep6Review(nc.id))
              );
              if (incomplete >= 0) {
                goToNc(incomplete);
                toast.error(t("Review every Major and Minor nonconformity before closing or returning."));
                return;
              }
            }
            const allEffective =
              ncFindings.length === 0
                ? finalDecision === "effective"
                : allNcsClosureEffective(ncFindings, reviewsRef.current);
            setClosing(true);
            try {
              const step6Data = buildStep6Payload(ncFindings, reviewsRef.current, {
                dateApproved,
                timeApproved,
              });
              await apiClient.updateAuditPlan(orgId, auditPlanId, { step6Data });
              if (allEffective) {
                await apiClient.updateAuditPlanStatus(orgId, auditPlanId, "closed");
                toast.success(t("All nonconformities are effective. Audit closed."));
              } else {
                const resetV = resetIneffectiveVerifications(ncFindings, vByFindingId);
                const vMap = Object.fromEntries(resetV.map((v) => [v.findingId, v]));
                await apiClient.updateAuditPlan(orgId, auditPlanId, {
                  step5Data: buildStep5Payload(
                    ncFindings,
                    vMap,
                    format(new Date(), "dd-MMM-yyyy HH:mm")
                  ),
                });
                await apiClient.updateAuditPlanStatus(orgId, auditPlanId, "verification_ineffective");
                toast.success(t("Ineffective nonconformities returned to the auditee. Effective ones stay closed."));
              }
              await invalidateAuditCaches(queryClient);
              router.push(auditTableHref(orgId));
            } catch (e) {
              console.error(e);
              toast.error(allEffective ? t("Failed to close audit.") : t("Failed to return to Auditee."));
            } finally {
              setClosing(false);
            }
          }}
        >
          {closing
            ? t("Saving…")
            : (ncFindings.length === 0 ? finalDecision === "effective" : allNcsClosureReviewed(ncFindings, {
                  ...reviewsRef.current,
                  ...(currentNc ? { [currentNc.id]: collectReviewFromForm(currentNc.id) } : {}),
                }) && allNcsClosureEffective(ncFindings, {
                  ...reviewsRef.current,
                  ...(currentNc ? { [currentNc.id]: collectReviewFromForm(currentNc.id) } : {}),
                }))
              ? t("Finalize Audit & Close")
              : t("Return ineffective NCs to Auditee")}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

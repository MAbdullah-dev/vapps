"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useRef, useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Paperclip,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import AuditWorkflowHeader from "@/components/audit/AuditWorkflowHeader";
import { AuditUploadedFilesList } from "@/components/audit/AuditUploadedFilesList";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { scrollToField } from "@/lib/scroll-to-field";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { useTranslate } from "@/components/providers/translation-provider";
import { useQueryClient } from "@tanstack/react-query";
import { auditTableHref, invalidateAuditCaches } from "@/lib/audit-query-cache";
import {
  type AuditNcFinding,
  type Step4ActionForm,
  emptyStep4Action,
  isNcFinding,
  parseStep4Actions,
} from "@/lib/audit-step4-ca";
import {
  type Step5NcVerification,
  allNcsEffective,
  allNcsVerified,
  buildStep5Payload,
  emptyStep5Verification,
  isStep5VerificationComplete,
  parseStep5Verifications,
} from "@/lib/audit-step5-verification";

export default function CreateAuditStep5Page() {
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
  const [leadAuditorName, setLeadAuditorName] = useState("—");
  const [leadAuditorIsLead, setLeadAuditorIsLead] = useState(false);
  const [verificationStartedAt, setVerificationStartedAt] = useState(() => format(new Date(), "dd-MMM-yyyy HH:mm"));

  const [verificationOutcome, setVerificationOutcome] = useState<
    "effective" | "ineffective" | null
  >(null);
  const [auditorComments, setAuditorComments] = useState("");
  const [commentsError, setCommentsError] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState<{ name: string; key: string }[]>([]);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [proceedingToStep6, setProceedingToStep6] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ncFindings, setNcFindings] = useState<AuditNcFinding[]>([]);
  const [currentNcIndex, setCurrentNcIndex] = useState(0);
  const [caByFindingId, setCaByFindingId] = useState<Record<string, Step4ActionForm>>({});
  const verificationsRef = useRef<Record<string, Step5NcVerification>>({});
  const currentNc = ncFindings[currentNcIndex] ?? null;
  const currentCa = currentNc ? caByFindingId[currentNc.id] ?? emptyStep4Action(currentNc.id) : null;

  useEffect(() => {
    if (!orgId || !auditPlanId) {
      setIsLoading(false);
      setVerificationStartedAt(format(new Date(), "dd-MMM-yyyy HH:mm"));
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
          if (typeof (plan as { step5Data?: { verificationStartedAt?: string } }).step5Data?.verificationStartedAt === "string") {
            setVerificationStartedAt((plan as { step5Data: { verificationStartedAt: string } }).step5Data.verificationStartedAt);
          } else {
            setVerificationStartedAt(format(new Date(), "dd-MMM-yyyy HH:mm"));
          }
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
        } catch {
          ncs = [];
        }
        if (cancelled) return;
        const parsedCa = parseStep4Actions(plan.step4Data, ncs);
        const parsedV = parseStep5Verifications(plan.step5Data, ncs);
        verificationsRef.current = parsedV;
        setCaByFindingId(parsedCa);
        setNcFindings(ncs);
        setCurrentNcIndex(0);
        const first = ncs[0] ? parsedV[ncs[0].id] : null;
        if (first) applyVerificationToForm(first);

        const membersRes = await apiClient.getMembers(orgId);
        if (!cancelled && membersRes.teamMembers?.length && plan.leadAuditorUserId) {
          const lead = membersRes.teamMembers.find((m: { id: string }) => m.id === plan.leadAuditorUserId);
          if (lead) {
            setLeadAuditorName(lead.name || lead.email || "—");
            setLeadAuditorIsLead(true);
          } else {
            setLeadAuditorName("—");
            setLeadAuditorIsLead(false);
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [orgId, auditPlanId]);

  const applyVerificationToForm = (v: Step5NcVerification) => {
    setVerificationOutcome(v.outcome);
    setAuditorComments(v.auditorComments ?? "");
    setEvidenceFiles(v.evidenceFiles ?? []);
    setCommentsError(false);
  };

  const collectVerificationFromForm = (findingId: string): Step5NcVerification => ({
    findingId,
    outcome: verificationOutcome,
    auditorComments,
    evidenceFiles,
    locked: verificationsRef.current[findingId]?.locked === true,
  });

  const flushCurrentVerification = () => {
    if (!currentNc) return collectVerificationFromForm("legacy");
    const collected = collectVerificationFromForm(currentNc.id);
    verificationsRef.current = { ...verificationsRef.current, [currentNc.id]: collected };
    return collected;
  };

  const goToNc = (index: number) => {
    if (index < 0 || index >= ncFindings.length || index === currentNcIndex) return;
    flushCurrentVerification();
    setCurrentNcIndex(index);
    const nc = ncFindings[index];
    applyVerificationToForm(verificationsRef.current[nc.id] ?? emptyStep5Verification(nc.id));
  };

  const handleEvidenceChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !orgId) return;
    if (!auditPlanId) {
      toast.error(t("Open this step from a submitted audit plan."));
      e.target.value = "";
      return;
    }
    setUploadingEvidence(true);
    try {
      const uploaded: { name: string; key: string }[] = [];
      for (let i = 0; i < files.length; i++) {
        const res = await apiClient.uploadAuditDocument(files[i], orgId, auditPlanId, 5);
        uploaded.push({ name: res.name, key: res.key });
      }
      setEvidenceFiles((prev) => [...prev, ...uploaded]);
    } catch (err) {
      console.error(err);
      toast.error(t("Could not upload the file. Please try again."));
    } finally {
      setUploadingEvidence(false);
      e.target.value = "";
    }
  };

  const currentVerificationLocked =
    Boolean(currentNc && verificationsRef.current[currentNc.id]?.locked);

  const canEditStep5 =
    isAssignedAuditor &&
    !["pending_closure", "closed", "verification_ineffective"].includes(planStatus ?? "");

  const canEditCurrentNc = canEditStep5 && !currentVerificationLocked;

  const persistStep5 = async () => {
    flushCurrentVerification();
    await apiClient.updateAuditPlan(orgId, auditPlanId, {
      step5Data: buildStep5Payload(ncFindings, verificationsRef.current, verificationStartedAt),
    });
  };

  const validateCurrentNc = (): boolean => {
    if (currentVerificationLocked) return true;
    if (verificationOutcome !== "effective" && verificationOutcome !== "ineffective") {
      toast.error(t("Mark this nonconformity as Effective or Ineffective."));
      return false;
    }
    if (auditorComments.trim() === "") {
      setCommentsError(true);
      scrollToField("audit-field-auditorComments");
      toast.error(t("Please fill in all required fields."));
      return false;
    }
    setCommentsError(false);
    return true;
  };

  const handleSaveStep5 = async () => {
    if (!validateCurrentNc()) return;
    if (!orgId || !auditPlanId) {
      toast.error(t("Open this step from a submitted audit plan."));
      return;
    }
    setSaving(true);
    try {
      await persistStep5();
      await invalidateAuditCaches(queryClient);
      router.push(auditTableHref(orgId));
    } catch (e) {
      console.error(e);
      toast.error(t("Failed to save."));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndContinue = async () => {
    if (!validateCurrentNc()) return;
    if (!orgId || !auditPlanId) {
      toast.error(t("Open this step from a submitted audit plan."));
      return;
    }
    setSaving(true);
    try {
      await persistStep5();
      await invalidateAuditCaches(queryClient);
      if (currentNcIndex < ncFindings.length - 1) {
        goToNc(currentNcIndex + 1);
        toast.success(t("Saved. Continue with the next nonconformity."));
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        toast.success(t("All nonconformity verifications on this page are saved."));
      }
    } catch (e) {
      console.error(e);
      toast.error(t("Failed to save."));
    } finally {
      setSaving(false);
    }
  };

  const handleFinalStep5 = async () => {
    if (!validateCurrentNc()) return;
    if (!orgId || !auditPlanId) {
      toast.error(t("Open this step from a submitted audit plan."));
      return;
    }
    flushCurrentVerification();
    if (ncFindings.length === 0) {
      toast.error(t("There are no major or minor nonconformities to verify."));
      return;
    }
    const incomplete = ncFindings.findIndex(
      (nc) => !isStep5VerificationComplete(verificationsRef.current[nc.id] ?? emptyStep5Verification(nc.id))
    );
    if (incomplete >= 0) {
      goToNc(incomplete);
      toast.error(t("Verify every Major and Minor nonconformity before submitting."));
      return;
    }
    const allEffective = allNcsEffective(ncFindings, verificationsRef.current);
    setProceedingToStep6(true);
    try {
      await persistStep5();
      if (allEffective) {
        await apiClient.updateAuditPlanStatus(orgId, auditPlanId, "pending_closure");
        toast.success(t("All nonconformities are effective. Submitted to Lead Auditor."));
      } else {
        await apiClient.updateAuditPlanStatus(orgId, auditPlanId, "verification_ineffective");
        toast.success(t("Ineffective nonconformities returned to the auditee. Effective ones stay closed."));
      }
      await invalidateAuditCaches(queryClient);
      router.push(auditTableHref(orgId));
    } catch (e) {
      console.error(e);
      toast.error(t("Failed to submit."));
    } finally {
      setProceedingToStep6(false);
    }
  };

  const finalAllEffective = allNcsVerified(ncFindings, {
    ...verificationsRef.current,
    ...(currentNc ? { [currentNc.id]: collectVerificationFromForm(currentNc.id) } : {}),
  }) && allNcsEffective(ncFindings, {
    ...verificationsRef.current,
    ...(currentNc ? { [currentNc.id]: collectVerificationFromForm(currentNc.id) } : {}),
  });

  const lockedSteps = useMemo(() => {
    if (!planStatus || !currentUserRole) return [];
    const locked: number[] = [];
    if (isLeadAuditor && !["pending_closure", "closed"].includes(planStatus)) locked.push(6);
    if (isAssignedAuditor && !["ca_submitted_to_auditor", "pending_closure", "closed"].includes(planStatus)) locked.push(5);
    return locked;
  }, [planStatus, currentUserRole, isLeadAuditor, isAssignedAuditor]);

  const leadAuditorDisplay = useMemo(
    () =>
      leadAuditorIsLead ? `${leadAuditorName} ${t("(Lead Auditor)")}` : leadAuditorName,
    [leadAuditorIsLead, leadAuditorName, t]
  );

  const auditTrailText = useMemo(
    () =>
      `${t("Verification Started")}\n${leadAuditorDisplay} • ${verificationStartedAt}\n\n${t("Awaiting Final Verification")}\n${t("---")}`,
    [t, leadAuditorDisplay, verificationStartedAt]
  );

  const handleCopyAuditTrail = async () => {
    try {
      await navigator.clipboard.writeText(auditTrailText);
      toast.success(t("Audit trail copied to clipboard"));
    } catch {
      toast.error(t("Failed to copy"));
    }
  };

  return (
    <div className="space-y-6">
      <AuditWorkflowHeader currentStep={5} orgId={orgId} allowedSteps={[1, 2, 3, 4, 5, 6]} lockedSteps={lockedSteps} stepQuery={stepQuery || undefined}  />
      {!canEditStep5 && currentUserRole != null && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {planStatus === "closed"
            ? t("View only — this audit is complete; no edits allowed.")
            : t("View only — only the assigned Auditor can edit this step.")}
        </div>
      )}
      <div className="rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className={cn(!canEditCurrentNc && "pointer-events-none select-none opacity-90")}>
          {/* Main title with thick green vertical bar to the left */}
          <div className="flex items-center">
            <div className="h-9 w-1.5 shrink-0 rounded-full bg-primary" />
            <h1 className="pl-3 text-xl font-bold uppercase tracking-wide text-foreground">
              {t("EFFECTIVENESS VERIFICATION")}
            </h1>
          </div>
          {ncFindings.length === 0 && !isLoading && (
            <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900">
              {t("No Major or Minor nonconformities were recorded. Verification is only required for those findings.")}
            </div>
          )}
          {ncFindings.length > 0 && currentNc && (
            <div className="mt-6 rounded-lg border border-border bg-muted/40 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {t("Verification")} {currentNcIndex + 1} {t("of")} {ncFindings.length}
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
                    {currentVerificationLocked && (
                      <span className="rounded bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                        {t("Verified effective — locked")}
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
                    const v =
                      i === currentNcIndex
                        ? collectVerificationFromForm(nc.id)
                        : verificationsRef.current[nc.id] ?? emptyStep5Verification(nc.id);
                    return (
                      <button
                        key={nc.id}
                        type="button"
                        onClick={() => goToNc(i)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-semibold",
                          i === currentNcIndex
                            ? "border-primary bg-primary text-primary-foreground"
                            : v.outcome === "effective"
                              ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                              : v.outcome === "ineffective"
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
              {currentCa && (
                <div className="mt-4 space-y-2 rounded-lg border border-border bg-card p-4 text-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {t("Corrective action submitted for this NC")}
                  </p>
                  <p><span className="font-semibold">{t("Responsible person")}:</span> {currentCa.responsiblePerson || t("—")}</p>
                  <p><span className="font-semibold">{t("Containment")}:</span> {currentCa.containmentDescription || t("—")}</p>
                  <p><span className="font-semibold">{t("Systemic CA")}:</span> {currentCa.systemicCorrectiveAction || t("—")}</p>
                  <AuditUploadedFilesList
                    files={[
                      ...currentCa.filesS2,
                      ...currentCa.filesS3,
                      ...currentCa.filesS6,
                      ...currentCa.filesS7,
                    ]}
                    className="pointer-events-auto"
                    emptyHint={<p className="text-xs text-muted-foreground">{t("No supporting files on this corrective action.")}</p>}
                  />
                </div>
              )}
            </div>
          )}

          {/* Verification Outcome */}
          <div className="mt-8 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wide text-foreground">
              {t("VERIFICATION OUTCOME")}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setVerificationOutcome("effective")}
                className={cn(
                  "h-auto flex flex-col items-center justify-center gap-3 rounded-lg p-6 text-center transition-colors",
                  verificationOutcome === "effective"
                    ? "border-2 border-primary bg-primary/10 text-primary hover:bg-primary/15 dark:bg-primary/20 dark:hover:bg-primary/25"
                    : "border border-border bg-card text-muted-foreground hover:border-border hover:bg-muted/40"
                )}
              >
                <CheckCircle
                  className={cn(
                    "h-14 w-14",
                    verificationOutcome === "effective" ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span className="text-sm font-bold uppercase tracking-wide">
                  {t("EFFECTIVE")}
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setVerificationOutcome("ineffective")}
                className={cn(
                  "h-auto flex flex-col items-center justify-center gap-3 rounded-lg p-6 text-center transition-colors",
                  verificationOutcome === "ineffective"
                    ? "border-2 border-primary bg-primary/10 text-primary hover:bg-primary/15 dark:bg-primary/20 dark:hover:bg-primary/25"
                    : "border border-border bg-card text-muted-foreground hover:border-border hover:bg-muted/40"
                )}
              >
                <XCircle
                  className={cn(
                    "h-14 w-14",
                    verificationOutcome === "ineffective" ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span className="text-sm font-bold uppercase tracking-wide">
                  {t("INEFFECTIVE")}
                </span>
              </Button>
            </div>
            <div className="flex gap-4 rounded-lg border border-primary/20 bg-primary/5 px-5 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                <RefreshCw className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wide text-primary">
                  {t("SYSTEM LOGIC")}
                </p>
                <p className="mt-1 italic leading-relaxed text-primary/90">
                  {t("Step 4 (Corrective Action) Marking as")}{" "}
                  <span className="font-bold not-italic text-primary">
                    {t("Ineffective")}
                  </span>{" "}
                  {t(
                    "returns only this nonconformity to the auditee. Effective nonconformities stay closed. Submit to the Lead Auditor only when every NC is Effective."
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Auditor's Verification Comments */}
          <div id="audit-field-auditorComments" className="mt-8 space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
              {t("AUDITOR'S VERIFICATION COMMENTS")} <span className="text-destructive" aria-hidden>*</span>
            </h2>
            <Textarea
              placeholder={t(
                "Detail the audit evidence used for verification (e.g., site visit on 04-Feb, review of..."
              )}
              className={cn("min-h-28 rounded-lg border-border bg-background", commentsError && "border-destructive focus-visible:ring-destructive")}
              rows={4}
              value={auditorComments}
              onChange={(e) => {
                setAuditorComments(e.target.value);
                if (commentsError) setCommentsError(false);
              }}
            />
            {commentsError && <p className="text-xs text-destructive">{t("This field is required")}</p>}
          </div>

          {/* Revised Risk Severity & Attach Evidence - horizontal */}
          <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-8">
            <div className="min-w-0 flex-1 space-y-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
                {t("REVISED RISK SEVERITY")}
              </h2>
              <div className="rounded-lg border border-border bg-muted px-4 py-3 text-base text-foreground">
                {t("Low (Level 2)")}
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
                {t("ATTACH EVIDENCE")}
              </h2>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleEvidenceChange}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 border-border bg-card py-6 text-foreground hover:bg-muted/40 sm:w-auto"
                disabled={uploadingEvidence}
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                {uploadingEvidence ? t("Uploading…") : t("ATTACH EVIDENCE")}
              </Button>
              <AuditUploadedFilesList
                files={evidenceFiles}
                className={!canEditCurrentNc ? "pointer-events-auto" : undefined}
                emptyHint={
                  canEditCurrentNc ? (
                    <p className="text-xs text-muted-foreground">{t("No files attached yet.")}</p>
                  ) : undefined
                }
              />
            </div>
          </div>

          {/* Verification Audit Trail */}
          <div className="mt-8 space-y-4 border border-border rounded-lg p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
                {t("VERIFICATION AUDIT TRAIL")}
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleCopyAuditTrail}
                className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                title={t("Copy audit trail")}
                aria-label={t("Copy audit trail")}
              >
                <ClipboardCheck className="h-5 w-5" />
              </Button>
            </div>
            <div className="space-y-0">
              {/* First entry: solid primary vertical bar alongside */}
              <div className="border-l-4 border-primary pl-4 pb-1">
                <p className="font-semibold text-foreground">
                  {t("Verification Started")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isLoading ? t("…") : `${leadAuditorDisplay} • ${verificationStartedAt}`}
                </p>
              </div>
              {/* Second entry: dashed light gray vertical bar, pending */}
              <div className="mt-3 border-l-4 border-dashed border-border pl-4">
                <p className="font-medium text-muted-foreground">
                  {t("Awaiting Final Verification")}
                </p>
                <p className="text-sm text-muted-foreground">{t("---")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step navigation */}
      <div className="flex flex-wrap items-center justify-end gap-4 px-2 py-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="border-border text-foreground hover:bg-muted/40"
            disabled={saving || !canEditCurrentNc}
            onClick={handleSaveStep5}
          >
            {saving ? t("Saving…") : t("Save")}
          </Button>
          {ncFindings.length > 1 && (
            <Button
              variant="outline"
              className="border-border text-foreground hover:bg-muted/40"
              disabled={saving || !canEditCurrentNc}
              onClick={handleSaveAndContinue}
            >
              {currentNcIndex < ncFindings.length - 1 ? t("SAVE & CONTINUE") : t("SAVE THIS NC")}
            </Button>
          )}
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={proceedingToStep6 || saving || !canEditStep5}
            onClick={handleFinalStep5}
          >
            {proceedingToStep6
              ? (finalAllEffective ? t("Submitting…") : t("Returning…"))
              : finalAllEffective
                ? t("Submit to Lead Auditor")
                : t("Return ineffective NCs to Auditee")}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

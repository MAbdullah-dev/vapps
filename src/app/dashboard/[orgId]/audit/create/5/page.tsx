"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useRef, useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import {
  CheckCircle,
  ChevronRight,
  ClipboardCheck,
  Paperclip,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import AuditWorkflowHeader from "@/components/audit/AuditWorkflowHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { useTranslate } from "@/components/providers/translation-provider";
import { AUDIT_STEP_HERO } from "@/lib/audit-step-screen-titles";

export default function CreateAuditStep5Page() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
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
  const [planStatus, setPlanStatus] = useState<string | null>(null);
  const [leadAuditorDisplay, setLeadAuditorDisplay] = useState("—");
  const [verificationStartedAt, setVerificationStartedAt] = useState(() => format(new Date(), "dd-MMM-yyyy HH:mm"));

  const [verificationOutcome, setVerificationOutcome] = useState<
    "effective" | "ineffective"
  >("effective");
  const [auditorComments, setAuditorComments] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<{ name: string; key: string }[]>([]);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [proceedingToStep6, setProceedingToStep6] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          setPlanStatus(plan.status ?? null);
          const step5 = (plan as { step5Data?: any }).step5Data;
          if (step5 && typeof step5 === "object") {
            if (step5.verificationOutcome === "effective" || step5.verificationOutcome === "ineffective") {
              setVerificationOutcome(step5.verificationOutcome);
            }
            if (typeof step5.auditorComments === "string") {
              setAuditorComments(step5.auditorComments);
            }
            if (Array.isArray(step5.evidenceFiles)) {
              setEvidenceFiles(step5.evidenceFiles as { name: string; key: string }[]);
            }
            if (typeof step5.verificationStartedAt === "string") {
              setVerificationStartedAt(step5.verificationStartedAt);
            } else {
              setVerificationStartedAt(format(new Date(), "dd-MMM-yyyy HH:mm"));
            }
          } else {
            setVerificationStartedAt(format(new Date(), "dd-MMM-yyyy HH:mm"));
          }
        }
        const membersRes = await apiClient.getMembers(orgId);
        if (!cancelled && membersRes.teamMembers?.length && plan.leadAuditorUserId) {
          const lead = membersRes.teamMembers.find((m: { id: string }) => m.id === plan.leadAuditorUserId);
          setLeadAuditorDisplay(lead ? `${lead.name || lead.email || "—"} (Lead Auditor)` : "—");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [orgId, auditPlanId]);

  const handleEvidenceChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !orgId) return;
    const planId = auditPlanId || "draft";
    setUploadingEvidence(true);
    try {
      const uploaded: { name: string; key: string }[] = [];
      for (let i = 0; i < files.length; i++) {
        const res = await apiClient.uploadAuditDocument(files[i], orgId, planId, 5);
        uploaded.push({ name: res.name, key: res.key });
      }
      setEvidenceFiles((prev) => [...prev, ...uploaded]);
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingEvidence(false);
      e.target.value = "";
    }
  };

  const canEditStep5 =
    currentUserRole === "assigned_auditor" &&
    !["pending_closure", "closed", "verification_ineffective"].includes(planStatus ?? "");

  /** Ineffective: return to auditee (Step 4). Effective: move to Step 6 for lead auditor. */
  const handleSaveStep5 = async () => {
    if (!orgId || !auditPlanId) return;
    setSaving(true);
    try {
      await apiClient.updateAuditPlan(orgId, auditPlanId, {
        step5Data: {
          verificationOutcome,
          auditorComments,
          evidenceFiles,
          verificationStartedAt,
        },
      });
      if (verificationOutcome === "ineffective") {
        await apiClient.updateAuditPlanStatus(orgId, auditPlanId, "verification_ineffective");
        toast.success("Returned to Auditee for revision.");
      } else {
        await apiClient.updateAuditPlanStatus(orgId, auditPlanId, "pending_closure");
        toast.success("Saved. Audit moved to Step 6 for Lead Auditor.");
      }
      router.push(`/dashboard/${orgId}/audit`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const lockedSteps = useMemo(() => {
    if (!planStatus || !currentUserRole) return [];
    const locked: number[] = [];
    if (currentUserRole === "lead_auditor" && !["pending_closure", "closed"].includes(planStatus)) locked.push(6);
    if (currentUserRole === "assigned_auditor" && !["ca_submitted_to_auditor", "pending_closure", "closed"].includes(planStatus)) locked.push(5);
    return locked;
  }, [planStatus, currentUserRole]);

  const auditTrailText = `Verification Started\n${leadAuditorDisplay} • ${verificationStartedAt}\n\nAwaiting Final Verification\n---`;

  const handleCopyAuditTrail = async () => {
    try {
      await navigator.clipboard.writeText(auditTrailText);
      toast.success("Audit trail copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="space-y-6">
      <AuditWorkflowHeader currentStep={5} orgId={orgId} allowedSteps={[1, 2, 3, 4, 5, 6]} lockedSteps={lockedSteps} stepQuery={stepQuery || undefined} exitHref="../.." />
      {!canEditStep5 && currentUserRole != null && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {planStatus === "closed"
            ? t("View only — this audit is complete; no edits allowed.")
            : t("View only — only the assigned Auditor can edit this step.")}
        </div>
      )}
      <div className="rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className={cn(!canEditStep5 && "pointer-events-none select-none opacity-90")}>
        {/* Main title with thick green vertical bar to the left */}
        <div className="flex items-center">
          <div className="h-9 w-1.5 shrink-0 rounded-full bg-green-500" />
          <div className="pl-3 min-w-0">
            <h1 className="text-xl font-bold uppercase tracking-wide text-foreground">
              {t(AUDIT_STEP_HERO[5])}
            </h1>
            <p className="mt-1 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {t("EFFECTIVENESS VERIFICATION")}
            </p>
          </div>
        </div>

        {/* Verification Outcome */}
        <div className="mt-8 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-foreground">
            VERIFICATION OUTCOME
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setVerificationOutcome("effective")}
              className={cn(
                "h-auto flex flex-col items-center justify-center gap-3 rounded-lg p-6 text-center transition-colors",
                verificationOutcome === "effective"
                  ? "border-2 border-green-500 bg-green-50 text-green-700 hover:bg-green-100"
                  : "border border-border bg-card text-muted-foreground hover:border-border hover:bg-muted/40"
              )}
            >
              <CheckCircle
                className={cn(
                  "h-14 w-14",
                  verificationOutcome === "effective" ? "text-green-600" : "text-muted-foreground"
                )}
              />
              <span className="text-sm font-bold uppercase tracking-wide">
                EFFECTIVE
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setVerificationOutcome("ineffective")}
              className={cn(
                "h-auto flex flex-col items-center justify-center gap-3 rounded-lg p-6 text-center transition-colors",
                verificationOutcome === "ineffective"
                  ? "border-2 border-green-500 bg-green-50 text-green-700 hover:bg-green-100"
                  : "border border-border bg-card text-muted-foreground hover:border-border hover:bg-muted/40"
              )}
            >
              <XCircle
                className={cn(
                  "h-14 w-14",
                  verificationOutcome === "ineffective" ? "text-green-600" : "text-muted-foreground"
                )}
              />
              <span className="text-sm font-bold uppercase tracking-wide">
                INEFFECTIVE
              </span>
            </Button>
          </div>
          <div className="flex gap-4 rounded-lg border border-green-200 bg-green-50 px-5 py-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-green-300 bg-green-100 text-green-600">
              <RefreshCw className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-green-800">
                SYSTEM LOGIC
              </p>
              <p className="mt-1 italic leading-relaxed text-green-900/90">
                Step 4 (Corrective Action) Marking as{" "}
                <span className="font-bold not-italic text-green-700">
                  Ineffective
                </span>{" "}
                will automatically route the workflow back to and flag the
                Auditee for a revised root cause analysis and corrective
                action.
              </p>
            </div>
          </div>
        </div>

        {/* Auditor's Verification Comments */}
        <div className="mt-8 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
            AUDITOR&apos;S VERIFICATION COMMENTS
          </h2>
          <Textarea
            placeholder="Detail the audit evidence used for verification (e.g., site visit on 04-Feb, review of..."
            className="min-h-28 rounded-lg border-border bg-background"
            rows={4}
            value={auditorComments}
            onChange={(e) => setAuditorComments(e.target.value)}
          />
        </div>

        {/* Revised Risk Severity & Attach Evidence - horizontal */}
        <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-8">
          <div className="min-w-0 flex-1 space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
              REVISED RISK SEVERITY
            </h2>
            <div className="rounded-lg border border-border bg-muted px-4 py-3 text-base text-foreground">
              Low (Level 2)
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
              ATTACH EVIDENCE
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
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              ATTACH EVIDENCE
            </Button>
            {evidenceFiles.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {evidenceFiles.length} file(s) selected
              </p>
            )}
          </div>
        </div>

        {/* Verification Audit Trail */}
        <div className="mt-8 space-y-4 border border-border rounded-lg p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
              VERIFICATION AUDIT TRAIL
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleCopyAuditTrail}
              className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Copy audit trail"
              aria-label="Copy audit trail"
            >
              <ClipboardCheck className="h-5 w-5" />
            </Button>
          </div>
          <div className="space-y-0">
            {/* First entry: solid green vertical bar alongside */}
            <div className="border-l-4 border-green-500 pl-4 pb-1">
              <p className="font-semibold text-foreground">
                Verification Started
              </p>
              <p className="text-sm text-muted-foreground">
                {isLoading ? "…" : `${leadAuditorDisplay} • ${verificationStartedAt}`}
              </p>
            </div>
            {/* Second entry: dashed light gray vertical bar, pending */}
            <div className="mt-3 border-l-4 border-dashed border-border pl-4">
              <p className="font-medium text-muted-foreground">
                Awaiting Final Verification
              </p>
              <p className="text-sm text-muted-foreground">---</p>
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
            disabled={saving || !auditPlanId || !canEditStep5}
            onClick={handleSaveStep5}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button
            className="bg-green-600 text-white hover:bg-green-700"
            disabled={proceedingToStep6 || saving || !auditPlanId || !canEditStep5}
            onClick={async () => {
              if (!orgId || !auditPlanId) return;
              setProceedingToStep6(true);
              try {
                await apiClient.updateAuditPlan(orgId, auditPlanId, {
                  step5Data: {
                    verificationOutcome,
                    auditorComments,
                    evidenceFiles,
                    verificationStartedAt,
                  },
                });
                if (verificationOutcome === "ineffective") {
                  await apiClient.updateAuditPlanStatus(orgId, auditPlanId, "verification_ineffective");
                  toast.success("Returned to Auditee for revision.");
                  router.push(`/dashboard/${orgId}/audit`);
                } else {
                  await apiClient.updateAuditPlanStatus(orgId, auditPlanId, "pending_closure");
                  toast.success("Submitted to Lead Auditor.");
                  router.push(`/dashboard/${orgId}/audit/create/6${stepQuery}`);
                }
              } catch (e) {
                console.error(e);
                toast.error(verificationOutcome === "ineffective" ? "Failed to return to Auditee." : "Failed to submit.");
              } finally {
                setProceedingToStep6(false);
              }
            }}
          >
            {proceedingToStep6
              ? (verificationOutcome === "ineffective" ? "Returning…" : "Submitting…")
              : verificationOutcome === "ineffective"
                ? "Return to Auditee"
                : "Submit to Lead Auditor"}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

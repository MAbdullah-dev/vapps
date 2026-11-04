"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { formatOptionalDate } from "@/lib/audit-date";
import { isBeforeToday, startOfToday } from "@/lib/audit-date";
import { useRef, useState, useEffect, useMemo, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { AlertTriangle, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ExternalLink, Info, Paperclip, Save, Send, ShieldCheck, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import AuditWorkflowHeader from "@/components/audit/AuditWorkflowHeader";
import { AuditUploadedFilesList } from "@/components/audit/AuditUploadedFilesList";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api-client";
import { scrollToField } from "@/lib/scroll-to-field";
import { useTranslate } from "@/components/providers/translation-provider";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { auditTableHref, invalidateAuditCaches } from "@/lib/audit-query-cache";
import { AUDIT_STEP_HERO } from "@/lib/audit-step-screen-titles";
import {
  type AuditNcFinding,
  type Step4ActionForm,
  emptyStep4Action,
  isNcFinding,
  isStep4ActionComplete,
  parseStep4Actions,
} from "@/lib/audit-step4-ca";
import {
  type Step5NcVerification,
  buildStep5Payload,
  ineffectiveFindingIds,
  parseStep5Verifications,
  resetIneffectiveVerifications,
} from "@/lib/audit-step5-verification";
import {
  type Step6NcReview,
  buildStep6Payload,
  ineffectiveClosureFindingIds,
  parseStep6Reviews,
  resetIneffectiveClosureReviews,
} from "@/lib/audit-step6-closure";

type Step4FileRef = { name: string; key: string };

const STEP4_MAX_FILE_BYTES = 25 * 1024 * 1024;
const STEP4_FILE_ACCEPT = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  "application/pdf",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".txt",
  ".csv",
].join(",");

function step4FileRejectReason(file: File): string | null {
  if (file.size <= 0) return "This file is empty.";
  if (file.size > STEP4_MAX_FILE_BYTES) return "File too large. Maximum size is 25 MB.";
  const mime = (file.type || "").toLowerCase();
  if (!mime) return null;
  const allowed =
    mime.startsWith("image/") ||
    mime === "application/pdf" ||
    mime === "application/msword" ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mime === "application/vnd.ms-excel" ||
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mime === "text/plain" ||
    mime === "text/csv";
  return allowed ? null : "This file type is not allowed.";
}

function htmlToPlainText(value: string): string {
  const s = String(value ?? "");
  if (!s.includes("<")) return s;
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function Step4InfoBanner({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-4 rounded-lg border border-blue-200 bg-blue-50 px-5 py-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-blue-300 bg-blue-100 text-blue-600">
        <Info className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1 text-sm leading-relaxed text-blue-900">{children}</div>
    </div>
  );
}

function Step4FileUpload({
  files,
  uploading,
  disabled,
  error,
  onPick,
  onRemove,
  browseLabel,
  uploadingLabel,
  hint,
  dragLabel,
  removeLabel,
}: {
  files: Step4FileRef[];
  uploading: boolean;
  disabled?: boolean;
  error?: boolean;
  onPick: (fileList: File[]) => void;
  onRemove: (key: string) => void;
  browseLabel: string;
  uploadingLabel: string;
  hint: string;
  dragLabel: string;
  removeLabel: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const takeFiles = (list: FileList | File[] | null) => {
    if (!list || disabled) return;
    const next = Array.from(list);
    if (next.length) onPick(next);
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-dashed bg-muted/40 p-6 transition-colors",
        error ? "border-destructive ring-1 ring-destructive" : "border-border",
        dragOver && !disabled ? "border-primary bg-primary/5" : ""
      )}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        takeFiles(e.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={STEP4_FILE_ACCEPT}
        multiple
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(e) => {
          takeFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
          <Paperclip className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">{dragLabel}</h3>
        <p className="text-xs text-muted-foreground">{hint}</p>
        <AuditUploadedFilesList
          files={files}
          onRemove={disabled ? undefined : (f) => onRemove(f.key)}
          removeLabel={removeLabel}
          className="pointer-events-auto"
        />
        <Button
          type="button"
          variant="outline"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground shadow-sm hover:bg-muted/40"
        >
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? uploadingLabel : browseLabel}
        </Button>
      </div>
    </div>
  );
}

export default function CreateAuditStep4Page() {
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
  const [isAuditee, setIsAuditee] = useState(false);
  const [planStatus, setPlanStatus] = useState<string | null>(null);
  const [auditorFeedbackStep5, setAuditorFeedbackStep5] = useState<string | null>(null);
  const [managementFeedbackStep6, setManagementFeedbackStep6] = useState<string | null>(null);
  const [auditeeDisplay, setAuditeeDisplay] = useState({ name: "—", uin: "—" });
  const [processDisplay, setProcessDisplay] = useState({ name: "—", ref: "—" });
  const [submissionDate, setSubmissionDate] = useState(format(new Date(), "dd-MM-yyyy"));
  const [submittingToAuditor, setSubmittingToAuditor] = useState(false);
  const [savingStep4, setSavingStep4] = useState(false);

  const [containmentDescription, setContainmentDescription] = useState("");
  const [responsiblePerson, setResponsiblePerson] = useState("");
  const [targetCompletionDate, setTargetCompletionDate] = useState<Date | undefined>(undefined);
  const [rootCauseNarrative, setRootCauseNarrative] = useState("");
  const [similarProcessesImpacted, setSimilarProcessesImpacted] = useState<"yes" | "no" | null>(null);
  const [similarProcessesList, setSimilarProcessesList] = useState("");
  const [notesS2, setNotesS2] = useState("");
  const [notesS6, setNotesS6] = useState("");
  const [notesS7, setNotesS7] = useState("");
  const [rootCauseResult, setRootCauseResult] = useState("");
  const [systemicCorrectiveAction, setSystemicCorrectiveAction] = useState("");
  const [rootCauseAnalysis, setRootCauseAnalysis] = useState("");
  const [correctiveActionPlan, setCorrectiveActionPlan] = useState("");
  const [implementationYesNo, setImplementationYesNo] = useState<"yes" | "no" | null>(null);
  const [implementationDetails, setImplementationDetails] = useState("");
  const [auditeeComments, setAuditeeComments] = useState("");
  const [auditeeName, setAuditeeName] = useState("");
  const [auditeePosition, setAuditeePosition] = useState("");
  const [dateOfReview, setDateOfReview] = useState<Date>(() => new Date());
  const [confirmReviewed, setConfirmReviewed] = useState(false);
  const [riskRatingPostAction, setRiskRatingPostAction] = useState<"high" | "medium" | "low" | null>(null);
  const [riskJustificationPost, setRiskJustificationPost] = useState("");

  const [filesS2, setFilesS2] = useState<{ name: string; key: string }[]>([]);
  const [filesS3, setFilesS3] = useState<{ name: string; key: string }[]>([]);
  const [filesS6, setFilesS6] = useState<{ name: string; key: string }[]>([]);
  const [filesS7, setFilesS7] = useState<{ name: string; key: string }[]>([]);
  const [files41, setFiles41] = useState<{ name: string; key: string }[]>([]);
  const [files42, setFiles42] = useState<{ name: string; key: string }[]>([]);
  const [files43, setFiles43] = useState<{ name: string; key: string }[]>([]);
  const [files45, setFiles45] = useState<{ name: string; key: string }[]>([]);
  const [files46, setFiles46] = useState<{ name: string; key: string }[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [step4Errors, setStep4Errors] = useState<Record<string, boolean>>({});
  const [ncFindings, setNcFindings] = useState<AuditNcFinding[]>([]);
  const [currentNcIndex, setCurrentNcIndex] = useState(0);
  const actionsRef = useRef<Record<string, Step4ActionForm>>({});
  const currentNc = ncFindings[currentNcIndex] ?? null;
  const [returnedFindingIds, setReturnedFindingIds] = useState<string[]>([]);
  const step5MapRef = useRef<Record<string, Step5NcVerification>>({});
  const step6MapRef = useRef<Record<string, Step6NcReview>>({});
  const step5StartedAtRef = useRef(format(new Date(), "dd-MMM-yyyy HH:mm"));

  useEffect(() => {
    if (!orgId || !auditPlanId) {
      setIsLoading(false);
      setSubmissionDate(format(new Date(), "dd-MM-yyyy"));
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
          setSubmissionDate(plan.datePrepared ? format(new Date(plan.datePrepared), "dd-MM-yyyy") : format(new Date(), "dd-MM-yyyy"));
          setCurrentUserRole(plan.currentUserRole ?? null);
          setIsLeadAuditor(Boolean(plan.isLeadAuditor) || plan.currentUserRole === "lead_auditor");
          setIsAssignedAuditor(Boolean(plan.isAssignedAuditor) || plan.currentUserRole === "assigned_auditor");
          setIsAuditee(Boolean(plan.isAuditee) || plan.currentUserRole === "auditee");
          setPlanStatus(plan.status ?? null);
          const step5 = (plan as { step5Data?: { auditorComments?: string; verificationStartedAt?: string } }).step5Data;
          if (step5 && typeof step5 === "object" && typeof step5.verificationStartedAt === "string") {
            step5StartedAtRef.current = step5.verificationStartedAt;
          }
          const step6 = (plan as { step6Data?: { managementComments?: string } }).step6Data;
          if (step6 && typeof step6 === "object" && typeof step6.managementComments === "string" && step6.managementComments.trim()) {
            setManagementFeedbackStep6(step6.managementComments.trim());
          } else {
            setManagementFeedbackStep6(null);
          }
        }
        const membersRes = await apiClient.getMembers(orgId);
        if (!cancelled && membersRes.teamMembers?.length) {
          const auditee = membersRes.teamMembers.find((m: { id: string }) => m.id === plan.auditeeUserId);
          const auditeeNameVal = auditee ? (auditee.name || auditee.email || "—") : "—";
          setAuditeeDisplay({
            name: auditeeNameVal,
            uin: auditee?.email ?? "—",
          });
          setAuditeeName(auditeeNameVal);
        }

        if (!cancelled && plan.auditProgramId) {
          const progRes = await apiClient.getAuditProgram(orgId, plan.auditProgramId);
          if (!cancelled && progRes.program) {
            setProcessDisplay({
              name: progRes.program.processName || plan.programName || "—",
              ref: plan.auditNumber || auditPlanId.slice(0, 8) + "...",
            });
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
        const parsed = parseStep4Actions(plan.step4Data, ncs);
        const parsedV = parseStep5Verifications(plan.step5Data, ncs);
        const parsedR = parseStep6Reviews(plan.step6Data, ncs);
        actionsRef.current = parsed;
        step5MapRef.current = parsedV;
        step6MapRef.current = parsedR;
        const returned =
          plan.status === "verification_ineffective"
            ? Array.from(
                new Set([
                  ...ineffectiveFindingIds(ncs, parsedV),
                  ...ineffectiveClosureFindingIds(ncs, parsedR),
                ])
              )
            : [];
        setReturnedFindingIds(returned);
        const feedback = returned
          .map((id) => parsedV[id]?.auditorComments?.trim())
          .filter(Boolean)
          .join("\n\n");
        setAuditorFeedbackStep5(feedback || null);
        setNcFindings(ncs);
        const startIdx = returned.length ? Math.max(0, ncs.findIndex((n) => n.id === returned[0])) : 0;
        setCurrentNcIndex(startIdx);
        const first = ncs[startIdx] ? parsed[ncs[startIdx].id] : ncs[0] ? parsed[ncs[0].id] : null;
        if (first) applyActionToForm(first);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [orgId, auditPlanId]);

  const applyActionToForm = (a: Step4ActionForm) => {
    setContainmentDescription(a.containmentDescription ?? "");
    setResponsiblePerson(a.responsiblePerson ?? "");
    setTargetCompletionDate(a.targetCompletionDate ? new Date(a.targetCompletionDate) : undefined);
    setRootCauseNarrative(htmlToPlainText(a.rootCauseNarrative ?? ""));
    setSimilarProcessesImpacted(a.similarProcessesImpacted);
    setSimilarProcessesList(a.similarProcessesList ?? "");
    setNotesS2(a.notesS2 ?? "");
    setNotesS6(a.notesS6 ?? a.implementationDetails ?? "");
    setNotesS7(a.notesS7 ?? "");
    setRootCauseResult(a.rootCauseResult ?? "");
    setSystemicCorrectiveAction(a.systemicCorrectiveAction ?? "");
    setRootCauseAnalysis(a.rootCauseAnalysis ?? "");
    setCorrectiveActionPlan(a.correctiveActionPlan ?? "");
    setImplementationYesNo(a.implementationYesNo);
    setImplementationDetails(a.implementationDetails ?? "");
    setAuditeeComments(a.auditeeComments ?? "");
    setAuditeeName(a.auditeeName ?? "");
    setAuditeePosition(a.auditeePosition ?? "");
    setDateOfReview(a.dateOfReview ? new Date(a.dateOfReview) : new Date());
    setConfirmReviewed(Boolean(a.confirmReviewed));
    setRiskRatingPostAction(a.riskRatingPostAction);
    setRiskJustificationPost(a.riskJustificationPost ?? "");
    setFilesS2(a.filesS2 ?? []);
    setFilesS3(a.filesS3 ?? []);
    setFilesS6(a.filesS6 ?? []);
    setFilesS7(a.filesS7 ?? []);
    setFiles41(a.files41 ?? []);
    setFiles42(a.files42 ?? []);
    setFiles43(a.files43 ?? []);
    setFiles45(a.files45 ?? []);
    setFiles46(a.files46 ?? []);
    setStep4Errors({});
  };

  const collectActionFromForm = (findingId: string): Step4ActionForm => ({
    findingId,
    containmentDescription,
    responsiblePerson,
    targetCompletionDate: targetCompletionDate ? targetCompletionDate.toISOString() : null,
    rootCauseNarrative,
    similarProcessesImpacted,
    similarProcessesList,
    notesS2,
    notesS6,
    notesS7,
    rootCauseResult,
    systemicCorrectiveAction,
    rootCauseAnalysis,
    correctiveActionPlan,
    implementationYesNo,
    implementationDetails: notesS6 || implementationDetails,
    auditeeComments,
    auditeeName,
    auditeePosition,
    dateOfReview: dateOfReview.toISOString(),
    confirmReviewed,
    riskRatingPostAction,
    riskJustificationPost,
    filesS2,
    filesS3,
    filesS6,
    filesS7,
    files41,
    files42,
    files43,
    files45,
    files46,
  });

  const flushCurrentAction = () => {
    if (!currentNc) return collectActionFromForm("legacy");
    const collected = collectActionFromForm(currentNc.id);
    actionsRef.current = { ...actionsRef.current, [currentNc.id]: collected };
    return collected;
  };

  const goToNc = (index: number) => {
    if (index < 0 || index >= ncFindings.length || index === currentNcIndex) return;
    flushCurrentAction();
    setCurrentNcIndex(index);
    const nc = ncFindings[index];
    applyActionToForm(actionsRef.current[nc.id] ?? emptyStep4Action(nc.id));
  };

  const setFilesBySection: Record<string, Dispatch<SetStateAction<Step4FileRef[]>>> = {
    s2: setFilesS2,
    s3: setFilesS3,
    s6: setFilesS6,
    s7: setFilesS7,
    "41": setFiles41,
    "42": setFiles42,
    "43": setFiles43,
    "45": setFiles45,
    "46": setFiles46,
  };

  const uploadFilesForSection = async (section: string, picked: File[]) => {
    const setFiles = setFilesBySection[section];
    if (!setFiles || picked.length === 0) return;
    if (!orgId) {
      toast.error(t("Organization is required to upload files."));
      return;
    }
    if (!auditPlanId) {
      toast.error(t("Open this step from a submitted audit plan."));
      return;
    }
    const accepted: File[] = [];
    for (const file of picked) {
      const reason = step4FileRejectReason(file);
      if (reason) {
        toast.error(`${file.name}: ${t(reason)}`);
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length === 0) return;
    setUploadingFile(true);
    try {
      const uploaded: Step4FileRef[] = [];
      for (const file of accepted) {
        const res = await apiClient.uploadAuditDocument(file, orgId, auditPlanId, 4);
        uploaded.push({ name: res.name, key: res.key });
      }
      setFiles((prev) => [...prev, ...uploaded]);
      if (section === "s2" && uploaded.length > 0) {
        setStep4Errors((prev) => ({ ...prev, filesS2: false }));
      }
      toast.success(
        uploaded.length === 1 ? t("File uploaded.") : t("Files uploaded.")
      );
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : t("Could not upload the file. Please try again."));
    } finally {
      setUploadingFile(false);
    }
  };

  const removeFileFromSection = (section: string, key: string) => {
    const setFiles = setFilesBySection[section];
    if (!setFiles) return;
    setFiles((prev) => prev.filter((f) => f.key !== key));
  };

  const buildStep4Payload = () => {
    const current = flushCurrentAction();
    const actions = ncFindings.map(
      (nc) => actionsRef.current[nc.id] ?? emptyStep4Action(nc.id)
    );
    const primary = currentNc ? (actionsRef.current[currentNc.id] ?? current) : current;
    return {
      version: 2,
      actions,
      ...primary,
    };
  };

  const validateStep4 = (): boolean => {
    const errors = {
      containmentDescription: containmentDescription.trim() === "",
      responsiblePerson: responsiblePerson.trim() === "",
      targetCompletionDate: !targetCompletionDate || isBeforeToday(targetCompletionDate),
      filesS2: filesS2.length === 0,
      auditeeComments: auditeeComments.trim() === "",
    };
    if (Object.values(errors).some(Boolean)) {
      setStep4Errors(errors);
      const order = ["containmentDescription", "responsiblePerson", "targetCompletionDate", "filesS2", "auditeeComments"] as const;
      const first = order.find((key) => errors[key]);
      if (first) scrollToField(`audit-field-${first}`);
      toast.error(
        t(isBeforeToday(targetCompletionDate) ? "Date cannot be before today." : "Please fill in all required fields.")
      );
      return false;
    }
    setStep4Errors({});
    return true;
  };

  const handleSaveStep4 = async () => {
    if (!canEditCurrentNc) {
      toast.error(t("This nonconformity was verified as effective and does not need a new corrective action."));
      return;
    }
    if (!validateStep4()) return;
    if (!orgId || !auditPlanId) {
      toast.error(t("Open this step from a submitted audit plan."));
      return;
    }
    setSavingStep4(true);
    try {
      await apiClient.saveAuditPlanStep4(orgId, auditPlanId, buildStep4Payload());
      await invalidateAuditCaches(queryClient);
      router.push(auditTableHref(orgId));
    } catch (e) {
      console.error(e);
    } finally {
      setSavingStep4(false);
    }
  };

  const handleSaveAndContinue = async () => {
    if (!canEditCurrentNc) {
      if (currentNcIndex < ncFindings.length - 1) goToNc(currentNcIndex + 1);
      return;
    }
    if (!validateStep4()) return;
    if (!orgId || !auditPlanId) {
      toast.error(t("Open this step from a submitted audit plan."));
      return;
    }
    setSavingStep4(true);
    try {
      await apiClient.saveAuditPlanStep4(orgId, auditPlanId, buildStep4Payload());
      await invalidateAuditCaches(queryClient);
      if (currentNcIndex < ncFindings.length - 1) {
        goToNc(currentNcIndex + 1);
        toast.success(t("Saved. Continue with the next nonconformity."));
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        toast.success(t("All nonconformity corrective actions are saved. Submit to the auditor when ready."));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingStep4(false);
    }
  };

  const validateAllNcActions = (): boolean => {
    flushCurrentAction();
    const toCheck =
      returnedFindingIds.length > 0
        ? ncFindings.filter((nc) => returnedFindingIds.includes(nc.id))
        : ncFindings;
    if (toCheck.length === 0 && ncFindings.length === 0) {
      toast.error(t("There are no major or minor nonconformities to action."));
      return false;
    }
    const incompleteNc = toCheck.find((nc) => !isStep4ActionComplete(actionsRef.current[nc.id] ?? emptyStep4Action(nc.id)));
    if (incompleteNc) {
      const idx = ncFindings.findIndex((n) => n.id === incompleteNc.id);
      if (idx >= 0) goToNc(idx);
      toast.error(
        t("Please complete the corrective action for every Major and Minor nonconformity before submitting.")
      );
      return false;
    }
    return true;
  };

  const canEditStep4 =
    planStatus !== "closed" &&
    isAuditee &&
    (planStatus == null ||
      planStatus === "findings_submitted_to_auditee" ||
      planStatus === "verification_ineffective");
  const canEditCurrentNc =
    canEditStep4 &&
    (!returnedFindingIds.length || (currentNc != null && returnedFindingIds.includes(currentNc.id)));

  const renderFileUpload = (section: string, files: Step4FileRef[], error?: boolean) => (
    <Step4FileUpload
      files={files}
      uploading={uploadingFile}
      disabled={!canEditCurrentNc}
      error={error}
      onPick={(list) => void uploadFilesForSection(section, list)}
      onRemove={(key) => removeFileFromSection(section, key)}
      browseLabel={t("BROWSE FILES")}
      uploadingLabel={t("Uploading…")}
      hint={t("JPG, PNG, PDF, Word, Excel, or text. Maximum size 25 MB. Drag and drop or browse.")}
      dragLabel={t("ATTACH FILE")}
      removeLabel={t("Remove file")}
    />
  );

  const lockedSteps = useMemo(() => {
    if (!planStatus || !currentUserRole) return [];
    const locked: number[] = [];
    if (isLeadAuditor && !["pending_closure", "closed"].includes(planStatus)) locked.push(6);
    if (isAssignedAuditor && !["ca_submitted_to_auditor", "pending_closure", "closed"].includes(planStatus)) locked.push(5);
    return locked;
  }, [planStatus, currentUserRole, isLeadAuditor, isAssignedAuditor]);

  return (
    <div className="space-y-6">
      <AuditWorkflowHeader currentStep={4} orgId={orgId} allowedSteps={[1, 2, 3, 4, 5, 6]} lockedSteps={lockedSteps} stepQuery={stepQuery || undefined}  />
      {!canEditStep4 && (currentUserRole != null || isAuditee) && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          {planStatus === "closed"
            ? t("View only — this audit is complete; no edits allowed.")
            : isAuditee
              ? t("View only — wait until findings have been submitted before completing corrective action.")
              : t("View only — only the Auditee can edit this step.")}
        </div>
      )}
      {planStatus === "verification_ineffective" && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-5 py-4 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold uppercase tracking-wide text-amber-900">
                {t("Returned for revision — Auditor feedback from Step 5: Verification ineffective")}
              </h3>
              {auditorFeedbackStep5 ? (
                <p className="mt-2 text-sm text-amber-900 whitespace-pre-wrap">{auditorFeedbackStep5}</p>
              ) : (
                <p className="mt-2 text-sm text-amber-800">
                  {t("The auditor marked one or more nonconformities as ineffective. Revise only those returned NCs and resubmit.")}
                </p>
              )}
            </div>
          </div>
          {managementFeedbackStep6 && (
            <div className="flex items-start gap-3 pt-2 border-t border-amber-200">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold uppercase tracking-wide text-amber-900">
                  {t("Management feedback from Step 6: Final closure — re-open")}
                </h3>
                <p className="mt-2 text-sm text-amber-900 whitespace-pre-wrap">{managementFeedbackStep6}</p>
              </div>
            </div>
          )}
        </div>
      )}
      <div className={canEditStep4 ? "" : "pointer-events-none select-none opacity-90"} style={canEditStep4 ? undefined : { minHeight: "200px" }}>
      <div className="rounded-lg border border-border bg-card p-8 shadow-sm">
        <h1 className="text-xl font-bold uppercase tracking-tight text-foreground">
          {t(AUDIT_STEP_HERO[4])}
        </h1>
        <p className="mt-3 text-xs font-bold uppercase tracking-wide text-red-600">
          {t("TO BE RESPONDED BY THE AUDITEE")}
        </p>
        <h2 className="mt-2 text-xl font-bold uppercase tracking-tight text-foreground">
          {t("SYSTEMIC CORRECTIVE ACTION")}
        </h2>
        {ncFindings.length === 0 && !isLoading && (
          <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            {t("No Major or Minor nonconformities were recorded in Step 3. Corrective action is only required for those findings.")}
          </div>
        )}
        {ncFindings.length > 0 && currentNc && (
          <div className="mt-6 rounded-lg border border-border bg-muted/40 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t("Corrective action")} {currentNcIndex + 1} {t("of")} {ncFindings.length}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 text-xs font-bold uppercase",
                      currentNc.status === "major_nc"
                        ? "bg-red-600 text-white"
                        : "bg-emerald-600 text-white"
                    )}
                  >
                    {currentNc.status === "major_nc" ? t("Major MA") : t("Minor mi")}
                  </span>
                  {returnedFindingIds.length > 0 && currentNc && returnedFindingIds.includes(currentNc.id) && (
                    <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      {t("Returned — revise this NC")}
                    </span>
                  )}
                  {returnedFindingIds.length > 0 && currentNc && !returnedFindingIds.includes(currentNc.id) && (
                    <span className="rounded bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                      {t("Verified effective — locked")}
                    </span>
                  )}
                  <span className="text-sm font-semibold text-foreground">
                    {currentNc.standard || t("—")}
                  </span>
                </div>
                <p className="text-sm text-foreground">
                  <span className="font-semibold">{t("Clause")}:</span> {currentNc.clause || t("—")}
                  {currentNc.subclauses ? ` · ${currentNc.subclauses}` : ""}
                </p>
                {currentNc.requirement ? (
                  <p className="text-sm text-muted-foreground">{currentNc.requirement}</p>
                ) : null}
                {currentNc.statementOfNonconformity ? (
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">{t("Statement of NC")}:</span>{" "}
                    {currentNc.statementOfNonconformity}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentNcIndex === 0}
                  onClick={() => goToNc(currentNcIndex - 1)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  {t("Previous NC")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentNcIndex >= ncFindings.length - 1}
                  onClick={() => goToNc(currentNcIndex + 1)}
                >
                  {t("Next NC")}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
            {ncFindings.length > 1 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {ncFindings.map((nc, i) => {
                  const complete = isStep4ActionComplete(
                    i === currentNcIndex
                      ? collectActionFromForm(nc.id)
                      : actionsRef.current[nc.id] ?? emptyStep4Action(nc.id)
                  );
                  return (
                    <button
                      key={nc.id}
                      type="button"
                      onClick={() => goToNc(i)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-semibold",
                        i === currentNcIndex
                          ? "border-primary bg-primary text-primary-foreground"
                          : complete
                            ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                            : "border-border bg-background text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {nc.status === "major_nc" ? "MA" : "mi"} {i + 1}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Blue info banner */}
        <div className="mt-6 flex items-center gap-4 rounded-lg border border-blue-200 bg-blue-50 px-5 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-blue-300 bg-blue-100 text-blue-600">
            <Info className="h-5 w-5" />
          </div>
          <p className="min-w-0 flex-1 text-sm text-blue-900">
            {t("Don't Just Fix The Mistake- Fix The System So The Mistake Can't Happen Again!")}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 rounded-lg border-blue-700 bg-blue-700 text-white hover:bg-blue-800 hover:text-white"
          >
            {t("Learn More")}
            <ExternalLink className="ml-1.5 h-4 w-4" />
          </Button>
        </div>

        {/* Yellow Systemic Prevention guideline box */}
        <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50/90 px-5 py-4">
          <p className="text-sm font-bold leading-snug text-amber-900">
            {t("SYSTEMIC PREVENTION — SYSTEMIC CORRECTIVE ACTION MEANS FIXING A PROBLEM AT ITS ROOT CAUSE, NOT JUST PATCHING THE SYMPTOM, SO IT DOESN'T HAPPEN AGAIN ANYWHERE IN THE SYSTEM")}
          </p>
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-amber-800">{t("It focus on:")}</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-900/90">
                <li>{t("Removing the real underlying cause of a nonconformity")}</li>
                <li>{t("Preventing the issue from recurring")}</li>
                <li>{t("Improving the overall management system")}</li>
                <li>{t("Aligning actions with long-term system goals")}</li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-amber-800">{t("Action must be SMART:")}</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-900/90">
                <li><span className="font-semibold">{t("Specific")}</span>{" "}{t("- Clearly target the exact issue")}</li>
                <li><span className="font-semibold">{t("Measurable")}</span>{" "}{t("- Evidence shows it's fixed")}</li>
                <li><span className="font-semibold">{t("Achievable")}</span>{" "}{t("- Realistic with available resources")}</li>
                <li><span className="font-semibold">{t("Relevant")}</span>{" "}{t("- Directly linked to audit findings and risks")}</li>
                <li><span className="font-semibold">{t("Time-bound")}</span>{" "}{t("- Completed within agreed deadlines")}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* S1 Containment */}
        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-bold uppercase tracking-wide text-foreground">
            {t("S1 CONTAINMENT")}{" "}
            <span className="text-blue-600">{t("— STOP THE BLEEDING IMMEDIATELY")}</span>
          </h2>
          <Step4InfoBanner>
            {t("Stop the bleeding immediately. Implement containment actions with defined timelines and responsible parties to control the issue and prevent further impact until a permanent solution is implemented. This approach is typical for minor nonconformities. Major nonconformities require systematic corrective actions, timelines, and responsible parties.")}
          </Step4InfoBanner>
          <div id="audit-field-containmentDescription" className="space-y-2">
            <Label className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {t("CONTAINMENT ACTION DESCRIPTION")}
            </Label>
            <Textarea
              placeholder={t("Describe the immediate actions taken to contain the nonconformity...")}
              className={cn("min-h-24 rounded-lg border-border", step4Errors.containmentDescription && "border-destructive focus-visible:ring-destructive")}
              rows={4}
              value={containmentDescription}
              onChange={(e) => {
                setContainmentDescription(e.target.value);
                if (step4Errors.containmentDescription) setStep4Errors((prev) => ({ ...prev, containmentDescription: false }));
              }}
            />
            {step4Errors.containmentDescription && <p className="text-xs text-destructive">{t("This field is required")}</p>}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div id="audit-field-responsiblePerson" className="space-y-2">
              <Label className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                {t("RESPONSIBLE PERSON")}
              </Label>
              <Input
                placeholder={t("Full Name / Job Title")}
                className={cn("rounded-lg border-border", step4Errors.responsiblePerson && "border-destructive focus-visible:ring-destructive")}
                value={responsiblePerson}
                onChange={(e) => {
                  setResponsiblePerson(e.target.value);
                  if (step4Errors.responsiblePerson) setStep4Errors((prev) => ({ ...prev, responsiblePerson: false }));
                }}
              />
              {step4Errors.responsiblePerson && <p className="text-xs text-destructive">{t("This field is required")}</p>}
            </div>
            <div id="audit-field-targetCompletionDate" className="space-y-2">
              <Label className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                {t("TARGET COMPLETION DATE")}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start rounded-lg border-border text-left font-normal",
                      !targetCompletionDate && "text-muted-foreground",
                      step4Errors.targetCompletionDate && "border-destructive"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatOptionalDate(targetCompletionDate, "dd-MM-yyyy") ?? t("Select date")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={targetCompletionDate}
                    disabled={{ before: startOfToday() }}
                    onSelect={(date) => {
                      if (!date || isBeforeToday(date)) return;
                      setTargetCompletionDate(date);
                      if (step4Errors.targetCompletionDate) setStep4Errors((prev) => ({ ...prev, targetCompletionDate: false }));
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {step4Errors.targetCompletionDate && (
                <p className="text-xs text-destructive">
                  {t(isBeforeToday(targetCompletionDate) ? "Date cannot be before today." : "This field is required")}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* S2 Evidence of S1 */}
        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-bold uppercase tracking-wide text-foreground">
            {t("S2 EVIDENCE OF S1")}{" "}
            <span className="text-blue-600">{t("— PROVE YOU STOPPED IT")}</span>
          </h2>
          <Step4InfoBanner>
            {t("Attach evidence that containment is in place. Describe what was stopped, isolated, or controlled, and upload supporting files such as photos, records, or documents.")}
          </Step4InfoBanner>
          <div className="space-y-2">
            <Label className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {t("EVIDENCE NOTES")}
            </Label>
            <Textarea
              placeholder={t("Describe the evidence that containment actions were implemented...")}
              className="min-h-24 rounded-lg border-border"
              rows={4}
              value={notesS2}
              onChange={(e) => setNotesS2(e.target.value)}
            />
          </div>
          <div id="audit-field-filesS2">
            {renderFileUpload("s2", filesS2, step4Errors.filesS2)}
            {step4Errors.filesS2 && <p className="mt-2 text-xs text-destructive">{t("This field is required")}</p>}
          </div>
        </section>

        {/* S3 Root Cause Analysis */}
        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-bold uppercase tracking-wide text-foreground">
            {t("S3 ROOT CAUSE ANALYSIS")}{" "}
            <span className="text-blue-600">{t("— THE DEEP DIVE USING 5-WHY OR FISHBONE")}</span>
          </h2>
          <Step4InfoBanner>
            {t("Root cause analysis identifies the underlying reason for a problem to ensure a permanent solution and prevent recurrence. Methods like 5 Whys, Fishbone Diagram / Ishikawa, Pareto Analysis, or FMEA can be used. RCA is required for corrective and preventive issues, optional for suggestions for improvement, and recommended for in-depth research of major nonconformities.")}
          </Step4InfoBanner>
          <div className="space-y-2">
            <Label className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {t("ROOT CAUSE ANALYSIS")}
            </Label>
            <Textarea
              placeholder={t("Enter the comprehensive root cause analysis narrative...")}
              className="min-h-32 rounded-lg border-border"
              rows={6}
              value={rootCauseNarrative}
              onChange={(e) => setRootCauseNarrative(e.target.value)}
            />
          </div>
          {renderFileUpload("s3", filesS3)}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">{t("SIMILAR PROCESSES IMPACTED, IF ANY")}</h3>
            <Step4InfoBanner>
              {t("Are there any processes that are affected? Please answer either Yes or No. If the answer is Yes, please provide a list of all the processes that are affected, making sure to include all relevant processes in the list.")}
            </Step4InfoBanner>
            <div className="flex flex-wrap gap-6">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name={`similarProcesses-${currentNc?.id ?? "current"}`}
                  checked={similarProcessesImpacted === "yes"}
                  onChange={() => setSimilarProcessesImpacted("yes")}
                  className="h-4 w-4 border-border text-green-600 focus:ring-green-500"
                />
                <span className="text-sm font-bold text-foreground">{t("YES")}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name={`similarProcesses-${currentNc?.id ?? "current"}`}
                  checked={similarProcessesImpacted === "no"}
                  onChange={() => setSimilarProcessesImpacted("no")}
                  className="h-4 w-4 border-border text-green-600 focus:ring-green-500"
                />
                <span className="text-sm font-bold text-foreground">{t("NO")}</span>
              </label>
            </div>
            <Textarea
              placeholder={t("Include all relevant processes...")}
              className="min-h-24 rounded-lg border-border"
              rows={4}
              value={similarProcessesList}
              onChange={(e) => setSimilarProcessesList(e.target.value)}
            />
          </div>
        </section>

        {/* S4 Root Cause Result */}
        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-bold uppercase tracking-wide text-foreground">
            {t("S4 ROOT CAUSE RESULT")}{" "}
            <span className="text-blue-600">{t("— CLEAR STATEMENT OF THE SYSTEMIC FAILURE")}</span>
          </h2>
          <Step4InfoBanner>
            {t("State the systemic failure clearly. Describe the weakness in process control or awareness that led to the nonconformity, and the result of the analysis in a concise narrative.")}
          </Step4InfoBanner>
          <div className="space-y-2">
            <Label className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {t("ROOT CAUSE RESULT")}
            </Label>
            <Textarea
              placeholder={t("Provide the multiline narrative result of the corrective action implementation...")}
              className="min-h-32 rounded-lg border-border"
              rows={6}
              value={rootCauseResult}
              onChange={(e) => setRootCauseResult(e.target.value)}
            />
          </div>
        </section>

        {/* S5 Systemic Corrective Action */}
        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-bold uppercase tracking-wide text-foreground">
            {t("S5 SYSTEMIC CORRECTIVE ACTION")}{" "}
            <span className="text-blue-600">{t("— CHANGE THE PROCESS, PROCEDURE, CONTROL PLAN, AND FLOWCHART")}</span>
          </h2>
          <Step4InfoBanner>
            {t("Systemic corrective actions include revising the underlying process to address root causes. Updated procedures, control plans, and flowcharts strengthen controls, clarify responsibilities, and ensure consistent implementation. Defined KPIs, internal audits, and management reviews monitor effectiveness to prevent recurrence.")}
          </Step4InfoBanner>
          <div className="space-y-2">
            <Label className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {t("SYSTEMIC CORRECTIVE ACTION")}
            </Label>
            <Textarea
              placeholder={t("Describe the process, procedure, control plan, or flowchart changes...")}
              className="min-h-32 rounded-lg border-border"
              rows={6}
              value={systemicCorrectiveAction}
              onChange={(e) => setSystemicCorrectiveAction(e.target.value)}
            />
          </div>
        </section>

        {/* S6 Evidence of Implementation S5 */}
        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-bold uppercase tracking-wide text-foreground">
            {t("S6 EVIDENCE OF IMPLEMENTATION S5")}{" "}
            <span className="text-blue-600">{t("— PROVE THE PROCESS CHANGED")}</span>
          </h2>
          <Step4InfoBanner>
            {t("Implementation evidence should demonstrate process changes and sustained compliance. Examples include revised documentation, training records, implementation photos or system logs, and monitoring results. Physical changes such as high-resolution before and after photos of new signage, shadow boards, or poka-yoke sensors.")}
          </Step4InfoBanner>
          <div className="space-y-2">
            <Label className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {t("IMPLEMENTATION NOTES")}
            </Label>
            <Textarea
              placeholder={t("Describe how the systemic corrective action was implemented...")}
              className="min-h-24 rounded-lg border-border"
              rows={4}
              value={notesS6}
              onChange={(e) => setNotesS6(e.target.value)}
            />
          </div>
          {renderFileUpload("s6", filesS6)}
        </section>

        {/* S7 Verification */}
        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-bold uppercase tracking-wide text-foreground">
            {t("S7 VERIFICATION")}
          </h2>
          <Step4InfoBanner>
            <p className="font-medium">
              {t("Objective evidence that the corrective action actually eliminated the root cause and remains effective over time.")}
            </p>
            <p className="mt-2">
              {t("It requires data-based proof such as KPI trends, defect rates, scrap, or customer complaints; sustained performance over 1–3 months or a defined production volume; confirmation that the issue has not recurred; and documented results or, if still within the monitoring period, a clear validation plan.")}
            </p>
          </Step4InfoBanner>
          <div className="space-y-2">
            <Label className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {t("VERIFICATION NOTES")}
            </Label>
            <Textarea
              placeholder={t("Describe the verification evidence and monitoring results...")}
              className="min-h-24 rounded-lg border-border"
              rows={4}
              value={notesS7}
              onChange={(e) => setNotesS7(e.target.value)}
            />
          </div>
          {renderFileUpload("s7", filesS7)}
        </section>

        {/* Risk Severity Review */}
        <div className="mt-8 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">{t("RISK SEVERITY REVIEW")}</h3>
          <Step4InfoBanner>
            {t("Following corrective actions and root cause analysis, the auditee should review risk severity to reflect the potential impact and likelihood of nonconformity, guiding prioritization, escalation, and follow-up.")}
          </Step4InfoBanner>
          <div className="flex flex-wrap gap-4">
            {(["high", "medium", "low"] as const).map((level) => (
              <label
                key={level}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border-2 px-6 py-2.5 text-sm font-bold uppercase tracking-wide transition-colors",
                  riskRatingPostAction === level
                    ? level === "high"
                      ? "border-red-500 bg-red-50 text-red-700"
                      : level === "medium"
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-border bg-background text-muted-foreground hover:border-input"
                )}
              >
                <input
                  type="radio"
                  name={`riskSeverityReview-${currentNc?.id ?? "current"}`}
                  checked={riskRatingPostAction === level}
                  onChange={() => setRiskRatingPostAction(level)}
                  className="sr-only"
                />
                {level === "high" ? t("High") : level === "medium" ? t("Medium") : t("Low")}
              </label>
            ))}
          </div>
        </div>

        {/* Auditee Comments (Mandatory) */}
        <div id="audit-field-auditeeComments" className="mt-8 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">{t("AUDITEE COMMENTS — MANDATORY")}</h3>
          <Textarea
            placeholder={t("Final auditee observations regarding the CA effectiveness and risk mitigation...")}
            className={cn("min-h-32 rounded-lg border-border", step4Errors.auditeeComments && "border-destructive focus-visible:ring-destructive")}
            rows={6}
            value={auditeeComments}
            onChange={(e) => {
              setAuditeeComments(e.target.value);
              if (step4Errors.auditeeComments) setStep4Errors((prev) => ({ ...prev, auditeeComments: false }));
            }}
          />
          {step4Errors.auditeeComments && <p className="text-xs text-destructive">{t("This field is required")}</p>}
        </div>

        {/* Risk Evaluation Guideline */}
        <div className="relative mt-8 overflow-hidden rounded-xl bg-slate-800 px-6 py-6 text-white shadow-lg">
          <h2 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-green-400">
            <ShieldCheck className="h-5 w-5" />
            {t("RISK EVALUATION GUIDELINE")}
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <p className="font-bold text-red-400">{t("HIGH SEVERITY")}</p>
              <p className="mt-1 text-sm text-slate-300">{t("Direct impact on product safety, regulatory compliance, or system-wide failure. Requires immediate containment.")}</p>
            </div>
            <div>
              <p className="font-bold text-amber-400">{t("MEDIUM SEVERITY")}</p>
              <p className="mt-1 text-sm text-slate-300">{t("Partial failure of core process. May impact customer satisfaction or operational efficiency if not addressed.")}</p>
            </div>
            <div>
              <p className="font-bold text-blue-400">{t("LOW SEVERITY")}</p>
              <p className="mt-1 text-sm text-slate-300">{t("Isolated administrative error or minor process deviation. Negligible impact on quality or safety.")}</p>
            </div>
          </div>
        </div>

        {/* Audit Details and Actions */}
        <div className="relative mt-6 overflow-hidden rounded-xl border-t-4 border-green-500/50 bg-slate-800 px-6 py-6 text-white shadow-lg">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-green-400">{t("AUDITEE NAME & UIN")}</p>
                <p className="mt-1 font-bold text-white">{isLoading ? "…" : auditeeDisplay.name}</p>
                <p className="text-sm text-slate-300">{isLoading ? "…" : auditeeDisplay.uin}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-green-400">{t("PROCESS")}</p>
                <p className="mt-1 font-bold text-white">{isLoading ? "…" : processDisplay.name}</p>
                <p className="text-sm text-slate-300">{isLoading ? "…" : processDisplay.ref}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-green-400">{t("DATE")}</p>
                <p className="mt-1 font-bold text-white">{submissionDate}</p>
                <p className="text-sm text-slate-300">{t("AUTOMATED LOG")}</p>
              </div>
            </div>
            <div className="rounded-lg border border-dashed border-slate-500 bg-slate-700/50 px-4 py-3 text-right sm:shrink-0">
              <p className="text-xs font-bold uppercase tracking-wide text-white">{t("VALIDATION NOTE")}</p>
              <p className="mt-1 text-xs text-slate-400">{t("This document is valid without a signature")}</p>
            </div>
          </div>
          <div className="mt-6 border-t border-slate-600 pt-6">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button
                type="button"
                variant="outline"
                disabled={savingStep4 || !canEditCurrentNc}
                onClick={handleSaveStep4}
                className="inline-flex items-center gap-2 rounded-lg border-2 border-primary bg-transparent px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-slate-700 hover:text-white"
              >
                <Save className="h-4 w-4" />
                {savingStep4 ? t("Saving…") : t("SAVE")}
              </Button>
              {ncFindings.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={savingStep4 || !canEditCurrentNc}
                  onClick={handleSaveAndContinue}
                  className="inline-flex items-center gap-2 rounded-lg border-2 border-primary bg-transparent px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-slate-700 hover:text-white"
                >
                  <Save className="h-4 w-4" />
                  {currentNcIndex < ncFindings.length - 1
                    ? t("SAVE & CONTINUE")
                    : t("SAVE THIS NC")}
                </Button>
              )}
              <Button
                type="button"
                disabled={submittingToAuditor || !canEditStep4}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
                onClick={async () => {
                  if (!validateStep4()) return;
                  if (!validateAllNcActions()) return;
                  if (!orgId || !auditPlanId) {
                    toast.error(t("Open this step from a submitted audit plan."));
                    return;
                  }
                  setSubmittingToAuditor(true);
                  try {
                    await apiClient.saveAuditPlanStep4(orgId, auditPlanId, buildStep4Payload());
                    if (planStatus === "verification_ineffective") {
                      const reset = resetIneffectiveVerifications(ncFindings, step5MapRef.current);
                      const map = Object.fromEntries(reset.map((v) => [v.findingId, v]));
                      const reset6 = resetIneffectiveClosureReviews(ncFindings, step6MapRef.current);
                      const map6 = Object.fromEntries(reset6.map((r) => [r.findingId, r]));
                      await apiClient.updateAuditPlan(orgId, auditPlanId, {
                        step5Data: buildStep5Payload(ncFindings, map, step5StartedAtRef.current),
                        step6Data: buildStep6Payload(ncFindings, map6, {
                          dateApproved: format(new Date(), "dd-MMM-yyyy"),
                          timeApproved: format(new Date(), "HH:mm"),
                        }),
                      });
                    }
                    await apiClient.updateAuditPlanStatus(orgId, auditPlanId, "ca_submitted_to_auditor");
                    await invalidateAuditCaches(queryClient);
                    router.push(auditTableHref(orgId));
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setSubmittingToAuditor(false);
                  }
                }}
              >
                <Send className="h-4 w-4" />
                {submittingToAuditor ? t("Submitting…") : t("SUBMIT TO AUDITOR")}
              </Button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

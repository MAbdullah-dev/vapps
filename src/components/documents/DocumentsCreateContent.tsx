"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Check, CheckCircle, FileText, Loader2, Save, Search } from "lucide-react";
import { getDashboardPath } from "@/lib/subdomain";
import { isAnnualReviewOverdue } from "@/lib/documentAnnualReview";
import { cn, documentActorMatches } from "@/lib/utils";
import CreateDocumentStep from "@/components/documents/steps/CreateDocumentStep";
import ReviewDocumentStep from "@/components/documents/steps/ReviewDocumentStep";
import ApprovalDocumentStep from "@/components/documents/steps/ApprovalDocumentStep";
import DocumentWorkflowPinGate from "@/components/documents/DocumentWorkflowPinGate";
import type {
  DocumentCorrectionPhase,
  DocumentSavePayload,
  DocumentWizardSnapshot,
  ProcessOption,
  SiteOption,
  StandardOption,
  Step1FormData,
} from "@/components/documents/types";
import { appendDocumentRecord } from "@/lib/documentLocalStorage";
import { toast } from "sonner";

type SitesApiResponse = {
  sites?: Array<{ id: string; name: string; code?: string; location?: string | null }>;
  organization?: { name?: string };
};

type ProcessesApiResponse = {
  processes?: Array<{ id: string; name: string; siteId?: string }>;
};

type ChecklistsApiResponse = {
  checklists?: Array<{ id: string; name: string }>;
};

type ChecklistQuestionsApiResponse = {
  questions?: Array<{ clause?: string; subclause?: string }>;
};

type Step = 1 | 2 | 3;

type RecordWorkflowStatus = "draft" | "in_review" | "in_approval" | "approved" | "";

function normalizeRecordWorkflow(raw: string | undefined | null): RecordWorkflowStatus {
  const x = String(raw ?? "").toLowerCase();
  if (x === "draft" || x === "in_review" || x === "in_approval" || x === "approved") return x;
  return "";
}

function DocumentWorkflowHydrationPlaceholder({ stepLabel }: { stepLabel: "Review" | "Approval" }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-6 py-24 text-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="h-9 w-9 animate-spin text-[#22B323]" aria-hidden />
      <p className="text-sm font-medium text-[#374151]">Loading document…</p>
      <p className="max-w-sm text-xs text-[#6B7280]">Securing access for {stepLabel}. Please wait.</p>
    </div>
  );
}

function inferCorrectionPhaseFromNotices(
  saved: Partial<Step1FormData> | undefined,
  workflowRaw: string | undefined,
  reviewNotice: { returnedAt?: string } | null | undefined,
  approvalNotice: { returnedAt?: string } | null | undefined
): DocumentCorrectionPhase {
  const fromSaved = saved?.correctionPhase;
  if (
    fromSaved === "awaiting_creator_after_review" ||
    fromSaved === "awaiting_reviewer_after_approval"
  ) {
    return fromSaved;
  }
  if ((workflowRaw ?? "").toLowerCase() !== "draft") return "none";
  const ar = approvalNotice?.returnedAt;
  const rr = reviewNotice?.returnedAt;
  if (ar && rr) {
    return new Date(ar) > new Date(rr)
      ? "awaiting_reviewer_after_approval"
      : "awaiting_creator_after_review";
  }
  if (ar) return "awaiting_reviewer_after_approval";
  if (rr) return "awaiting_creator_after_review";
  return "none";
}

export default function DocumentsCreateContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = (params?.orgId as string) || "";
  const recordId = searchParams?.get("recordId") ?? "";
  const mode = (searchParams?.get("mode") ?? "create").toLowerCase();
  const revisionType = (searchParams?.get("revisionType") ?? "").toLowerCase();
  const requestedStepParam = searchParams?.get("step") ?? "1";
  const initialStep: Step =
    requestedStepParam === "3" ? 3 : requestedStepParam === "2" ? 2 : 1;
  const isEditMode = mode === "edit" && Boolean(recordId);
  const isViewMode = mode === "view" && Boolean(recordId);

  const [step, setStep] = useState<Step>(initialStep);
  const [formData, setFormData] = useState<Step1FormData>({
    title: "",
    docType: "P",
    description: "",
    loginUserName: "",
    loginUserId: "",
    createdByUserId: "",
    createdByUserName: "",
    correctionPhase: "none",
    organizationName: "",
    organizationIdentification: "",
    industryType: "",
    otherIndustry: "",
    site: "",
    siteId: "",
    location: "",
    processName: "",
    processId: "",
    processOwner: "",
    processOwnerUserId: "",
    approverName: "",
    approverUserId: "",
    managementStandard: "",
    clause: "",
    subClause: "",
  });
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [processes, setProcesses] = useState<ProcessOption[]>([]);
  const [isLoadingContext, setIsLoadingContext] = useState(true);
  const [isLoadingSites, setIsLoadingSites] = useState(false);
  const [isLoadingProcesses, setIsLoadingProcesses] = useState(false);
  const [standards, setStandards] = useState<StandardOption[]>([]);
  const [clauseOptions, setClauseOptions] = useState<string[]>([]);
  const [subClauseOptions, setSubClauseOptions] = useState<string[]>([]);
  const [isLoadingStandards, setIsLoadingStandards] = useState(false);
  const [isLoadingClauses, setIsLoadingClauses] = useState(false);
  /** True while fetching a saved record; start true when URL has recordId so Review/Approval never paint before PIN gate is known. */
  const [isHydratingRecord, setIsHydratingRecord] = useState(() => Boolean(recordId));
  const [initialWizardData, setInitialWizardData] = useState<Partial<DocumentWizardSnapshot> | null>(null);
  const [previewDocRefFromRecord, setPreviewDocRefFromRecord] = useState<string | null>(null);
  const [activeRecordId, setActiveRecordId] = useState<string>(recordId);
  const [isApprovedRecord, setIsApprovedRecord] = useState(false);
  const [reviewReturnNotice, setReviewReturnNotice] = useState<{
    comments: string;
    decision: "effective" | "ineffective" | null;
    returnedAt: string;
    reviewerName: string | null;
  } | null>(null);
  const [approvalReturnNotice, setApprovalReturnNotice] = useState<{
    comments: string;
    decision: "effective" | "ineffective" | null;
    returnedAt: string;
    approverName: string | null;
  } | null>(null);
  const [recordWorkflowStatus, setRecordWorkflowStatus] = useState<RecordWorkflowStatus>("");
  const [reviewedAtIso, setReviewedAtIso] = useState<string | null>(null);
  const [annualRequestNote, setAnnualRequestNote] = useState("");
  const [annualReviewActionBusy, setAnnualReviewActionBusy] = useState(false);
  /** Server: Process Owner / Approver on a locked PIN document must verify before Review/Approval UI. */
  const [workflowPinGateRequired, setWorkflowPinGateRequired] = useState(false);
  const [workflowPinGateSatisfied, setWorkflowPinGateSatisfied] = useState(true);
  const workflowPinForPatchesRef = useRef("");

  const steps = useMemo(
    () => [
      { step: 1 as const, label: "Create Document", icon: FileText },
      { step: 2 as const, label: "Review", icon: Search },
      { step: 3 as const, label: "Approval", icon: CheckCircle },
    ],
    []
  );

  const listHref = orgId ? getDashboardPath(orgId, "documents") : "/";
  const canProceedStep1 = Boolean(
    formData.site && formData.processName && formData.processOwner.trim() && formData.approverName.trim()
  );

  const canAccessReviewStep = useMemo(
    () =>
      documentActorMatches(
        formData.loginUserId,
        formData.loginUserName,
        formData.processOwnerUserId,
        formData.processOwner
      ),
    [formData.loginUserId, formData.loginUserName, formData.processOwnerUserId, formData.processOwner]
  );
  const canAccessApprovalStep = useMemo(
    () =>
      documentActorMatches(
        formData.loginUserId,
        formData.loginUserName,
        formData.approverUserId,
        formData.approverName
      ),
    [formData.loginUserId, formData.loginUserName, formData.approverUserId, formData.approverName]
  );

  const correctionPhase: DocumentCorrectionPhase = formData.correctionPhase ?? "none";

  const hasPersistedRecord = Boolean(recordId || activeRecordId);
  const wf = normalizeRecordWorkflow(recordWorkflowStatus);

  const isDocCreator = useMemo(
    () =>
      documentActorMatches(
        formData.loginUserId,
        formData.loginUserName,
        formData.createdByUserId,
        formData.createdByUserName
      ),
    [
      formData.loginUserId,
      formData.loginUserName,
      formData.createdByUserId,
      formData.createdByUserName,
    ]
  );

  const isDocumentStakeholder = useMemo(
    () => isDocCreator || canAccessReviewStep || canAccessApprovalStep,
    [isDocCreator, canAccessReviewStep, canAccessApprovalStep]
  );

  /** Only the author may edit Create, except Process Owner during approval-return correction. */
  const createStepEditable =
    !isViewMode &&
    (hasPersistedRecord
      ? (correctionPhase === "awaiting_creator_after_review" && isDocCreator) ||
        (correctionPhase === "awaiting_reviewer_after_approval" && canAccessReviewStep) ||
        (correctionPhase === "none" && (wf === "draft" || wf === "") && isDocCreator) ||
        (isEditMode && isApprovedRecord && isDocCreator)
      : true);

  const createStepReadOnly = isViewMode || !createStepEditable;

  /** Only Process Owner may act on Review while document is in review. */
  const reviewStepInteractive = canAccessReviewStep && wf === "in_review";
  const reviewReadOnlyObserver = !reviewStepInteractive && isDocumentStakeholder;

  /** Only designated Approver may act on Approval while document is in approval. */
  const approvalStepInteractive = canAccessApprovalStep && wf === "in_approval";
  const approvalReadOnlyObserver = !approvalStepInteractive && isDocumentStakeholder;

  const isLoggedIn = Boolean(formData.loginUserId?.trim() || formData.loginUserName?.trim());

  const showAnnualReReviewGate = useMemo(
    () =>
      hasPersistedRecord &&
      wf === "approved" &&
      Boolean(reviewedAtIso) &&
      isAnnualReviewOverdue(reviewedAtIso),
    [hasPersistedRecord, wf, reviewedAtIso]
  );

  const annualRvStatus = formData.annualReviewRevalidation?.status ?? "none";

  const runAnnualReviewAction = async (
    patchAction: "annual-review-request" | "annual-review-accept" | "annual-review-decline",
    requestMessage?: string
  ) => {
    if (!orgId || !activeRecordId) return;
    setAnnualReviewActionBusy(true);
    try {
      const res = await fetch(`/api/organization/${orgId}/documents`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: activeRecordId,
          action: patchAction,
          message: requestMessage,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        const msg =
          typeof payload.error === "string" && payload.error.trim()
            ? payload.error
            : "Could not update annual review. Please try again.";
        toast.error(msg);
        return;
      }
      if (patchAction === "annual-review-request") {
        toast.success("Re-review request sent to the document creator.");
        setFormData((prev) => ({
          ...prev,
          annualReviewRevalidation: {
            status: "pending",
            requestedByUserId: prev.loginUserId,
            requestedByUserName: prev.loginUserName,
            requestedAt: new Date().toISOString(),
            message: (requestMessage ?? "").trim().slice(0, 2000),
          },
        }));
        setAnnualRequestNote("");
      } else if (patchAction === "annual-review-accept") {
        toast.success("Re-review accepted. The document is now in review.");
        setRecordWorkflowStatus("in_review");
        setFormData((prev) => ({
          ...prev,
          annualReviewRevalidation: {
            ...prev.annualReviewRevalidation,
            status: "accepted",
            creatorDecisionAt: new Date().toISOString(),
          },
        }));
      } else {
        toast.success("Re-review request declined.");
        setFormData((prev) => ({
          ...prev,
          annualReviewRevalidation: {
            ...prev.annualReviewRevalidation,
            status: "declined",
            creatorDecisionAt: new Date().toISOString(),
          },
        }));
      }
    } catch {
      toast.error("Network error. Check your connection and try again.");
    } finally {
      setAnnualReviewActionBusy(false);
    }
  };

  /**
   * Any logged-in user with a saved record can switch tabs to view. If id/name matching fails for
   * Process Owner / Approver, they still need to reach Review to see the amber “restricted” message
   * or sign in with the right account — tabs must not stay greyed out for that reason alone.
   */
  const canNavigateToStep = (target: Step) => {
    if (!hasPersistedRecord) return target === 1;
    if (!isLoggedIn) return false;
    return target === 1 || target === 2 || target === 3;
  };

  useEffect(() => {
    if (isHydratingRecord) return;
    if (!formData.loginUserName?.trim() && !formData.loginUserId?.trim()) return;
    if (!canNavigateToStep(step)) {
      const first: Step = canNavigateToStep(1)
        ? 1
        : canNavigateToStep(2)
          ? 2
          : canNavigateToStep(3)
            ? 3
            : 1;
      setStep(first);
    }
  }, [
    step,
    isHydratingRecord,
    formData.loginUserName,
    formData.loginUserId,
    formData.processOwner,
    recordId,
    activeRecordId,
    hasPersistedRecord,
    isLoggedIn,
    correctionPhase,
    recordWorkflowStatus,
    canAccessReviewStep,
    canAccessApprovalStep,
    router,
    listHref,
  ]);

  useEffect(() => {
    let ignore = false;

    async function loadContext() {
      if (!orgId) return;
      setIsLoadingContext(true);
      setIsLoadingSites(true);
      try {
        const [profileRes, orgInfoRes, sitesRes] = await Promise.all([
          fetch("/api/user/profile", { credentials: "include" }),
          fetch(`/api/organization/${orgId}/organization-info`, { credentials: "include" }),
          fetch(`/api/organization/${orgId}/sites`, { credentials: "include" }),
        ]);

        const profileJson = profileRes.ok ? await profileRes.json() : null;
        const orgInfoJson = orgInfoRes.ok ? await orgInfoRes.json() : null;
        const sitesJson = sitesRes.ok ? await sitesRes.json() : null;

        if (ignore) return;

        const typedSitesJson = (sitesJson ?? {}) as SitesApiResponse;
        const loadedSites: SiteOption[] = (typedSitesJson.sites ?? []).map((site) => ({
          id: String(site.id),
          name: String(site.name ?? site.code ?? ""),
          code: String(site.code ?? ""),
          location: site.location ? String(site.location) : "",
        }));

        setSites(loadedSites);
        setFormData((prev) => ({
          ...prev,
          loginUserId: String(profileJson?.id ?? prev.loginUserId ?? ""),
          loginUserName: String(profileJson?.name ?? prev.loginUserName ?? ""),
          createdByUserId: prev.createdByUserId || String(profileJson?.id ?? ""),
          createdByUserName: prev.createdByUserName || String(profileJson?.name ?? ""),
          organizationName: String(
            orgInfoJson?.organizationInfo?.name ??
              typedSitesJson.organization?.name ??
              prev.organizationName ??
              ""
          ),
          organizationIdentification: String(
            orgInfoJson?.organizationInfo?.registrationId ??
              prev.organizationIdentification ??
              ""
          ),
          industryType: String(orgInfoJson?.organizationInfo?.industry ?? prev.industryType ?? ""),
        }));
      } finally {
        if (!ignore) {
          setIsLoadingSites(false);
          setIsLoadingContext(false);
        }
      }
    }

    void loadContext();
    return () => {
      ignore = true;
    };
  }, [orgId]);

  useEffect(() => {
    let ignore = false;
    async function loadProcesses() {
      if (!orgId || !formData.site) {
        setProcesses([]);
        return;
      }
      setIsLoadingProcesses(true);
      try {
        const res = await fetch(
          `/api/organization/${orgId}/processes?siteId=${encodeURIComponent(formData.site)}`,
          { credentials: "include" }
        );
        const json = res.ok ? await res.json() : { processes: [] };
        if (ignore) return;
        const typedProcesses = (json ?? {}) as ProcessesApiResponse;
        const loadedProcesses: ProcessOption[] = (typedProcesses.processes ?? []).map((process) => ({
          id: String(process.id),
          name: String(process.name ?? ""),
          siteId: String(process.siteId ?? formData.site),
        }));
        setProcesses(loadedProcesses);
      } finally {
        if (!ignore) setIsLoadingProcesses(false);
      }
    }
    void loadProcesses();
    return () => {
      ignore = true;
    };
  }, [orgId, formData.site]);

  useEffect(() => {
    let ignore = false;
    async function loadStandards() {
      if (!orgId) return;
      setIsLoadingStandards(true);
      try {
        const res = await fetch(`/api/organization/${orgId}/audit-checklists`, {
          credentials: "include",
        });
        const json = res.ok ? await res.json() : { checklists: [] };
        if (ignore) return;
        const typed = (json ?? {}) as ChecklistsApiResponse;
        const loadedStandards: StandardOption[] = (typed.checklists ?? []).map((item) => ({
          id: String(item.id),
          name: String(item.name ?? ""),
        }));
        setStandards(loadedStandards);
      } finally {
        if (!ignore) setIsLoadingStandards(false);
      }
    }
    void loadStandards();
    return () => {
      ignore = true;
    };
  }, [orgId]);

  useEffect(() => {
    let ignore = false;
    async function loadClauses() {
      if (!orgId || !formData.managementStandard) {
        setClauseOptions([]);
        setSubClauseOptions([]);
        return;
      }
      setIsLoadingClauses(true);
      try {
        const res = await fetch(
          `/api/organization/${orgId}/audit/checklist-questions?checklistId=${encodeURIComponent(
            formData.managementStandard
          )}`,
          { credentials: "include" }
        );
        const json = res.ok ? await res.json() : { questions: [] };
        if (ignore) return;
        const typed = (json ?? {}) as ChecklistQuestionsApiResponse;
        const questions = typed.questions ?? [];
        const clauses = Array.from(
          new Set(
            questions
              .map((q) => (q.clause ?? "").trim())
              .filter((clause) => clause.length > 0)
          )
        );
        setClauseOptions(clauses);
        setSubClauseOptions([]);
      } finally {
        if (!ignore) setIsLoadingClauses(false);
      }
    }
    void loadClauses();
    return () => {
      ignore = true;
    };
  }, [orgId, formData.managementStandard]);

  useEffect(() => {
    let ignore = false;
    async function loadSubClauses() {
      if (!orgId || !formData.managementStandard || !formData.clause) {
        setSubClauseOptions([]);
        return;
      }
      try {
        const res = await fetch(
          `/api/organization/${orgId}/audit/checklist-questions?checklistId=${encodeURIComponent(
            formData.managementStandard
          )}`,
          { credentials: "include" }
        );
        const json = res.ok ? await res.json() : { questions: [] };
        if (ignore) return;
        const typed = (json ?? {}) as ChecklistQuestionsApiResponse;
        const questions = typed.questions ?? [];
        const subClauses = Array.from(
          new Set(
            questions
              .filter((q) => (q.clause ?? "").trim() === formData.clause)
              .map((q) => (q.subclause ?? "").trim())
              .filter((sub) => sub.length > 0)
          )
        );
        setSubClauseOptions(subClauses);
      } catch {
        if (!ignore) setSubClauseOptions([]);
      }
    }
    void loadSubClauses();
    return () => {
      ignore = true;
    };
  }, [orgId, formData.managementStandard, formData.clause]);

  useEffect(() => {
    if (!recordId) {
      setReviewReturnNotice(null);
      setApprovalReturnNotice(null);
      setRecordWorkflowStatus("");
      setPreviewDocRefFromRecord(null);
      setReviewedAtIso(null);
      setWorkflowPinGateRequired(false);
      setWorkflowPinGateSatisfied(true);
      workflowPinForPatchesRef.current = "";
    }
  }, [recordId]);

  const showWorkflowPinWall =
    hasPersistedRecord &&
    workflowPinGateRequired &&
    !workflowPinGateSatisfied &&
    (step === 2 || step === 3);

  /** Before the first fetch resolves we do not know documentWorkflowPinGate — avoid flashing Review/Approval content. */
  const showWorkflowStepsHydrationShell =
    Boolean(recordId) && isHydratingRecord && (step === 2 || step === 3);

  useLayoutEffect(() => {
    if (recordId) {
      setIsHydratingRecord(true);
    } else {
      setIsHydratingRecord(false);
    }
  }, [recordId]);

  useEffect(() => {
    let ignore = false;
    async function loadExistingRecord() {
      if (!recordId) {
        if (!ignore) setIsHydratingRecord(false);
        return;
      }
      if (!orgId) return;
      setIsHydratingRecord(true);
      try {
        const res = await fetch(
          `/api/organization/${orgId}/documents?id=${encodeURIComponent(recordId)}&includeAll=1`,
          { credentials: "include" }
        );
        const json = res.ok ? await res.json() : { records: [] };
        if (ignore) return;
        const rows = Array.isArray(json?.records) ? json.records : [];
        const notice = json?.reviewReturnNotice as
          | {
              comments?: string;
              decision?: "effective" | "ineffective" | null;
              returnedAt?: string;
              reviewerName?: string | null;
            }
          | null
          | undefined;
        if (notice && typeof notice === "object") {
          setReviewReturnNotice({
            comments: String(notice.comments ?? ""),
            decision:
              notice.decision === "ineffective"
                ? "ineffective"
                : notice.decision === "effective"
                  ? "effective"
                  : null,
            returnedAt: String(notice.returnedAt ?? ""),
            reviewerName: notice.reviewerName ?? null,
          });
        } else {
          setReviewReturnNotice(null);
        }
        const approvalNotice = json?.approvalReturnNotice as
          | {
              comments?: string;
              decision?: "effective" | "ineffective" | null;
              returnedAt?: string;
              approverName?: string | null;
            }
          | null
          | undefined;
        if (approvalNotice && typeof approvalNotice === "object") {
          setApprovalReturnNotice({
            comments: String(approvalNotice.comments ?? ""),
            decision:
              approvalNotice.decision === "ineffective"
                ? "ineffective"
                : approvalNotice.decision === "effective"
                  ? "effective"
                  : null,
            returnedAt: String(approvalNotice.returnedAt ?? ""),
            approverName: approvalNotice.approverName ?? null,
          });
        } else {
          setApprovalReturnNotice(null);
        }
        const row = rows[0] as {
          form_data?: Partial<Step1FormData>;
          wizard_data?: Partial<DocumentWizardSnapshot>;
          workflow_status?: string;
          created_by_user_id?: string | null;
          created_by_user_name?: string | null;
          preview_doc_ref?: string;
          reviewed_at?: string | null;
          documentWorkflowPinGate?: boolean;
        } | undefined;
        setPreviewDocRefFromRecord(
          row?.preview_doc_ref?.trim() ? String(row.preview_doc_ref).trim() : null
        );
        const ra = String(row?.reviewed_at ?? "").trim();
        setReviewedAtIso(ra || null);
        setRecordWorkflowStatus(normalizeRecordWorkflow(row?.workflow_status));
        if (row?.form_data) {
          const saved = row.form_data as Partial<Step1FormData>;
          setFormData((prev) => ({
            ...prev,
            ...saved,
            loginUserId: prev.loginUserId,
            loginUserName: prev.loginUserName,
            createdByUserId: String(
              saved.createdByUserId ?? row.created_by_user_id ?? prev.createdByUserId ?? ""
            ),
            createdByUserName: String(
              saved.createdByUserName ?? row.created_by_user_name ?? prev.createdByUserName ?? ""
            ),
            correctionPhase: inferCorrectionPhaseFromNotices(
              saved,
              row.workflow_status,
              notice,
              approvalNotice
            ),
          }));
        }
        const baseWizard = row?.wizard_data ?? null;
        const approved = (row?.workflow_status ?? "").toLowerCase() === "approved";
        const forcedRevisionWizard =
          isEditMode && approved
            ? {
                ...(baseWizard ?? {}),
                actionType: "revise" as const,
                reviseSubAction: revisionType === "transfer" ? ("transfer" as const) : ("update" as const),
              }
            : baseWizard;
        setInitialWizardData(forcedRevisionWizard);
        setActiveRecordId(recordId);
        setIsApprovedRecord(approved);
        const pinGate = row?.documentWorkflowPinGate === true;
        setWorkflowPinGateRequired(pinGate);
        setWorkflowPinGateSatisfied(!pinGate);
        workflowPinForPatchesRef.current = "";
      } finally {
        if (!ignore) setIsHydratingRecord(false);
      }
    }
    void loadExistingRecord();
    return () => {
      ignore = true;
    };
  }, [orgId, recordId, isEditMode, revisionType]);

  const setField = <K extends keyof Step1FormData>(field: K, value: Step1FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const redirectToDocuments = () => {
    router.push(listHref);
  };

  const handleSubmitProceed = async (payload: DocumentSavePayload) => {
    let createdId = "";
    let submittedOk = false;
    try {
      if (!orgId) throw new Error("Missing orgId");
      const res = await fetch(`/api/organization/${orgId}/documents`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "submitted",
          saveMode: isEditMode ? (isApprovedRecord ? "revision" : "create") : "create",
          recordId: isEditMode ? activeRecordId : undefined,
          payload,
        }),
      });
      if (!res.ok) throw new Error("Failed to save submitted document");
      const json = await res.json();
      createdId = String(json?.id ?? "");
      setReviewReturnNotice(null);
      setApprovalReturnNotice(null);
      submittedOk = true;
    } catch {
      // Temporary fallback so users do not lose data while backend/table rollout continues.
      appendDocumentRecord(orgId || "tenant", "submitted", payload);
    }
    if (createdId) setActiveRecordId(createdId);
    if (submittedOk) redirectToDocuments();
  };

  const handleSaveDraft = async (payload: DocumentSavePayload) => {
    try {
      if (!orgId) throw new Error("Missing orgId");
      const res = await fetch(`/api/organization/${orgId}/documents`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "draft",
          saveMode: isEditMode ? (isApprovedRecord ? "revision-draft" : "edit-draft") : "create",
          recordId: isEditMode ? activeRecordId : undefined,
          payload,
        }),
      });
      if (!res.ok) throw new Error("Failed to save draft document");
    } catch {
      appendDocumentRecord(orgId || "tenant", "draft", payload);
    }
    redirectToDocuments();
  };

  const handleReviewSubmit = async (payload: { comments: string; decision: "effective" | "ineffective" | null }) => {
    if (!orgId || !activeRecordId) {
      if (payload.decision === "ineffective") {
        setRecordWorkflowStatus("draft");
        setField("correctionPhase", "awaiting_creator_after_review");
        setStep(1);
        setReviewReturnNotice({
          comments: payload.comments,
          decision: "ineffective",
          returnedAt: new Date().toISOString(),
          reviewerName: formData.loginUserName?.trim() || null,
        });
      } else {
        redirectToDocuments();
      }
      return;
    }
    const isIneffective = payload.decision === "ineffective";
    try {
      const res = await fetch(`/api/organization/${orgId}/documents`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: activeRecordId,
          action: isIneffective ? "review-return" : "review-submit",
          comments: payload.comments,
          decision: payload.decision,
          ...(workflowPinGateRequired ? { documentPin: workflowPinForPatchesRef.current } : {}),
        }),
      });
      const patchJson = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
      if (!res.ok) {
        const msg =
          typeof patchJson.error === "string" && patchJson.error.trim()
            ? patchJson.error
            : "Could not update review.";
        toast.error(msg);
        return;
      }
      if (isIneffective) {
        setRecordWorkflowStatus("draft");
        setField("correctionPhase", "awaiting_creator_after_review");
        setStep(1);
        setReviewReturnNotice({
          comments: payload.comments,
          decision: "ineffective",
          returnedAt: new Date().toISOString(),
          reviewerName: formData.loginUserName?.trim() || null,
        });
      } else {
        redirectToDocuments();
      }
    } catch {
      return;
    }
  };

  const handleApproveFinish = async (payload: { comments: string; decision: "effective" | "ineffective" | null }) => {
    const isIneffective = payload.decision === "ineffective";
    if (!orgId || !activeRecordId) {
      if (isIneffective) {
        setRecordWorkflowStatus("draft");
        setField("correctionPhase", "awaiting_reviewer_after_approval");
        setStep(1);
        setApprovalReturnNotice({
          comments: payload.comments,
          decision: "ineffective",
          returnedAt: new Date().toISOString(),
          approverName: formData.loginUserName?.trim() || null,
        });
      } else {
        redirectToDocuments();
      }
      return;
    }
    try {
      const res = await fetch(`/api/organization/${orgId}/documents`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: activeRecordId,
          action: isIneffective ? "approval-return" : "approve",
          comments: payload.comments,
          decision: payload.decision,
          ...(workflowPinGateRequired ? { documentPin: workflowPinForPatchesRef.current } : {}),
        }),
      });
      const patchJson = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
      if (!res.ok) {
        const msg =
          typeof patchJson.error === "string" && patchJson.error.trim()
            ? patchJson.error
            : "Could not update approval.";
        toast.error(msg);
        return;
      }
    } catch {
      return;
    }
    if (isIneffective) {
      setRecordWorkflowStatus("draft");
      setField("correctionPhase", "awaiting_reviewer_after_approval");
      setStep(1);
      setApprovalReturnNotice({
        comments: payload.comments,
        decision: "ineffective",
        returnedAt: new Date().toISOString(),
        approverName: formData.loginUserName?.trim() || null,
      });
    } else {
      redirectToDocuments();
    }
  };

  return (
    <div className="space-y-6">
      <Card className="py-4">
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
            <h2 className="text-lg font-bold text-[#0A0A0A]">Document Management</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Save size={14} />
                Save Draft
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={listHref}>Exit to Dashboard</Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {steps.map(({ step: s, label, icon: Icon }) => {
              const isCurrent = step === s;
              const isDone = step > s;
              const DisplayIcon = isDone ? Check : Icon;
              const navAllowed = canNavigateToStep(s) || s === step;
              return (
                <button
                  key={s}
                  type="button"
                  disabled={!navAllowed}
                  onClick={() => {
                    if (!canNavigateToStep(s)) return;
                    setStep(s);
                  }}
                  className={cn(
                    "rounded-lg border px-4 py-3 transition-all",
                    "flex flex-col items-center justify-center min-h-[92px] gap-2",
                    !navAllowed && "opacity-40 cursor-not-allowed",
                    isCurrent
                      ? "bg-[#22B323] border-[#22B323] text-white"
                      : isDone
                      ? "bg-[#EEFFF3] border-[#22B323] text-[#15803D]"
                      : "bg-[#F3F4F6] border-[#E5E7EB] text-[#6B7280] hover:bg-[#EBEEF2]"
                  )}
                >
                  <span
                    className={cn(
                      "h-8 w-8 rounded-full border flex items-center justify-center",
                      isCurrent
                        ? "border-white/70 bg-white/15"
                        : isDone
                        ? "border-[#22B323] bg-[#22B323]"
                        : "border-[#D1D5DB] bg-white"
                    )}
                  >
                    <DisplayIcon size={15} className={cn(isCurrent || isDone ? "text-white" : "text-[#9CA3AF]")} />
                  </span>
                  <span className="text-xs font-medium">{label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {reviewReturnNotice ? (
        <div
          role="status"
          className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[#991B1B] shadow-sm"
        >
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#DC2626]" aria-hidden />
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-[#7F1D1D]">
                Document marked ineffective — returned for correction
                {reviewReturnNotice.reviewerName ? (
                  <span className="font-normal text-[#991B1B]">
                    {" "}
                    (Reviewer: {reviewReturnNotice.reviewerName})
                  </span>
                ) : null}
              </p>
              {reviewReturnNotice.comments.trim() ? (
                <p className="text-sm leading-relaxed text-[#7F1D1D]">
                  <span className="font-medium text-[#991B1B]">Reviewer comment: </span>
                  {reviewReturnNotice.comments.trim()}
                </p>
              ) : (
                <p className="text-sm text-[#991B1B]">No additional comment was provided.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {approvalReturnNotice ? (
        <div
          role="status"
          className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[#991B1B] shadow-sm"
        >
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#DC2626]" aria-hidden />
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-[#7F1D1D]">
                Approval marked ineffective — returned for correction
                {approvalReturnNotice.approverName ? (
                  <span className="font-normal text-[#991B1B]">
                    {" "}
                    (Approver: {approvalReturnNotice.approverName})
                  </span>
                ) : null}
              </p>
              {approvalReturnNotice.comments.trim() ? (
                <p className="text-sm leading-relaxed text-[#7F1D1D]">
                  <span className="font-medium text-[#991B1B]">Approver comment: </span>
                  {approvalReturnNotice.comments.trim()}
                </p>
              ) : (
                <p className="text-sm text-[#991B1B]">No additional comment was provided.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {showAnnualReReviewGate && !isHydratingRecord ? (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950 shadow-sm"
          role="region"
          aria-label="Annual document re-review"
        >
          <p className="font-semibold text-amber-900">Annual re-review required</p>
          <p className="mt-2 leading-relaxed text-amber-950/90">
            At least one year has passed since the last review on this approved document. The Process
            Owner may perform review again only after the document creator accepts a re-review request.
          </p>
          {annualRvStatus === "pending" ? (
            isDocCreator ? (
              <div className="mt-4 space-y-3">
                <p>
                  <span className="font-medium">
                    {formData.annualReviewRevalidation?.requestedByUserName?.trim() || "A user"}
                  </span>{" "}
                  asked to start a new review cycle.
                </p>
                {formData.annualReviewRevalidation?.message?.trim() ? (
                  <div className="rounded-md border border-amber-200/80 bg-white/70 px-3 py-2 text-amber-950">
                    {formData.annualReviewRevalidation.message}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="bg-amber-700 text-white hover:bg-amber-800"
                    disabled={annualReviewActionBusy}
                    onClick={() => void runAnnualReviewAction("annual-review-accept")}
                  >
                    Accept — allow Process Owner to review
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-amber-300"
                    disabled={annualReviewActionBusy}
                    onClick={() => void runAnnualReviewAction("annual-review-decline")}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-amber-900/90">
                Waiting for{" "}
                <span className="font-medium">
                  {formData.createdByUserName?.trim() || "the document creator"}
                </span>{" "}
                to accept the re-review request before the Process Owner can continue.
              </p>
            )
          ) : (
            <div className="mt-4 space-y-3">
              {annualRvStatus === "declined" ? (
                <p className="text-amber-900">
                  The creator declined the previous request. You may send another request.
                </p>
              ) : null}
              <Textarea
                value={annualRequestNote}
                onChange={(e) => setAnnualRequestNote(e.target.value)}
                placeholder="Optional note to the document creator (why re-review is needed)"
                rows={3}
                className="max-w-xl border-amber-200 bg-white/80 text-amber-950 placeholder:text-amber-800/50"
              />
              <Button
                type="button"
                size="sm"
                className="bg-amber-700 text-white hover:bg-amber-800"
                disabled={annualReviewActionBusy || !isLoggedIn}
                onClick={() => void runAnnualReviewAction("annual-review-request", annualRequestNote)}
              >
                Send re-review request to document creator
              </Button>
              {!isLoggedIn ? (
                <p className="text-xs text-amber-800/80">Sign in to send a request.</p>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {/* <Card className="py-4">
        <CardContent className="space-y-5"> */}
          {step === 1 && (
            <CreateDocumentStep
              orgId={orgId}
              formData={formData}
              title={formData.title}
              setTitle={(value) => setField("title", value)}
              docType={formData.docType}
              setDocType={(value) => setField("docType", value)}
              site={formData.site}
              setSite={(value) => {
                const selectedSite = sites.find((item) => item.id === value);
                setFormData((prev) => ({
                  ...prev,
                  site: value,
                  siteId: selectedSite?.code ?? "",
                  location: selectedSite?.location ?? "",
                  processName: "",
                  processId: "",
                }));
              }}
              processName={formData.processName}
              setProcessName={(value) => {
                const selectedProcess = processes.find((item) => item.id === value);
                setFormData((prev) => ({
                  ...prev,
                  processName: selectedProcess?.name ?? "",
                  processId: selectedProcess?.id ?? "",
                }));
              }}
              description={formData.description}
              setDescription={(value) => setField("description", value)}
              loginUserName={formData.loginUserName}
              loginUserId={formData.loginUserId}
              organizationName={formData.organizationName}
              organizationIdentification={formData.organizationIdentification}
              industryType={formData.industryType}
              otherIndustry={formData.otherIndustry}
              setOtherIndustry={(value) => setField("otherIndustry", value)}
              siteId={formData.siteId}
              location={formData.location}
              processId={formData.processId}
              processOwner={formData.processOwner}
              setProcessOwner={(value) => setField("processOwner", value)}
              processOwnerUserId={formData.processOwnerUserId}
              setProcessOwnerUserId={(value) => setField("processOwnerUserId", value)}
              approverName={formData.approverName}
              setApproverName={(value) => setField("approverName", value)}
              approverUserId={formData.approverUserId}
              setApproverUserId={(value) => setField("approverUserId", value)}
              managementStandard={formData.managementStandard}
              setManagementStandard={(value) => {
                setFormData((prev) => ({
                  ...prev,
                  managementStandard: value,
                  clause: "",
                  subClause: "",
                }));
              }}
              clause={formData.clause}
              setClause={(value) => {
                setFormData((prev) => ({
                  ...prev,
                  clause: value,
                  subClause: "",
                }));
              }}
              subClause={formData.subClause}
              setSubClause={(value) => setField("subClause", value)}
              standards={standards}
              clauseOptions={clauseOptions}
              subClauseOptions={subClauseOptions}
              isLoadingStandards={isLoadingStandards}
              isLoadingClauses={isLoadingClauses}
              sites={sites}
              processes={processes}
              isLoadingContext={isLoadingContext}
              isLoadingSites={isLoadingSites}
              isLoadingProcesses={isLoadingProcesses}
              canProceed={canProceedStep1 && !isHydratingRecord && !isViewMode && !createStepReadOnly}
              isViewMode={isViewMode || createStepReadOnly}
              initialWizard={initialWizardData ?? undefined}
              initialPreviewDocRef={previewDocRefFromRecord ?? undefined}
              recordId={recordId || undefined}
              onSubmitProceed={handleSubmitProceed}
              onSaveDraft={handleSaveDraft}
            />
          )}

          {step === 2 &&
            (showWorkflowStepsHydrationShell ? (
              <DocumentWorkflowHydrationPlaceholder stepLabel="Review" />
            ) : showWorkflowPinWall && orgId && activeRecordId ? (
              <DocumentWorkflowPinGate
                orgId={orgId}
                recordId={activeRecordId}
                onVerified={(pin) => {
                  workflowPinForPatchesRef.current = pin;
                  setWorkflowPinGateSatisfied(true);
                }}
              />
            ) : (
              <ReviewDocumentStep
                title={formData.title}
                docType={formData.docType}
                site={formData.siteId || formData.site}
                processName={formData.processName}
                description={formData.description}
                processOwner={formData.processOwner}
                processOwnerUserId={formData.processOwnerUserId}
                loginUserName={formData.loginUserName}
                loginUserId={formData.loginUserId}
                managementStandard={formData.managementStandard}
                clause={formData.clause}
                subClause={formData.subClause}
                processId={formData.processId}
                readOnlyObserver={reviewReadOnlyObserver}
                onBack={() => setStep(1)}
                onNext={handleReviewSubmit}
              />
            ))}

          {step === 3 &&
            (showWorkflowStepsHydrationShell ? (
              <DocumentWorkflowHydrationPlaceholder stepLabel="Approval" />
            ) : showWorkflowPinWall && orgId && activeRecordId ? (
              <DocumentWorkflowPinGate
                orgId={orgId}
                recordId={activeRecordId}
                onVerified={(pin) => {
                  workflowPinForPatchesRef.current = pin;
                  setWorkflowPinGateSatisfied(true);
                }}
              />
            ) : (
              <ApprovalDocumentStep
                listHref={listHref}
                title={formData.title}
                docType={formData.docType}
                site={formData.siteId || formData.site}
                processName={formData.processName}
                processOwner={formData.processOwner}
                designatedApproverName={formData.approverName}
                designatedApproverUserId={formData.approverUserId}
                loginUserName={formData.loginUserName}
                loginUserId={formData.loginUserId}
                managementStandard={formData.managementStandard}
                clause={formData.clause}
                subClause={formData.subClause}
                processId={formData.processId}
                readOnlyObserver={approvalReadOnlyObserver}
                onBack={() => setStep(2)}
                onApprove={handleApproveFinish}
              />
            ))}
        {/* </CardContent>
      </Card> */}
    </div>
  );
}


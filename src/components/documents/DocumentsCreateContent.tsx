"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, CheckCircle, FileText, Save, Search } from "lucide-react";
import { getDashboardPath } from "@/lib/subdomain";
import { cn } from "@/lib/utils";
import CreateDocumentStep from "@/components/documents/steps/CreateDocumentStep";
import ReviewDocumentStep from "@/components/documents/steps/ReviewDocumentStep";
import ApprovalDocumentStep from "@/components/documents/steps/ApprovalDocumentStep";
import type {
  DocumentSavePayload,
  DocumentWizardSnapshot,
  ProcessOption,
  SiteOption,
  StandardOption,
  Step1FormData,
} from "@/components/documents/types";
import { appendDocumentRecord } from "@/lib/documentLocalStorage";

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

export default function DocumentsCreateContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = (params?.orgId as string) || "";
  const recordId = searchParams?.get("recordId") ?? "";
  const mode = (searchParams?.get("mode") ?? "create").toLowerCase();
  const revisionType = (searchParams?.get("revisionType") ?? "").toLowerCase();
  const isEditMode = mode === "edit" && Boolean(recordId);
  const isViewMode = mode === "view" && Boolean(recordId);

  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState<Step1FormData>({
    title: "",
    docType: "P",
    description: "",
    loginUserName: "",
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
  const [isHydratingRecord, setIsHydratingRecord] = useState(false);
  const [initialWizardData, setInitialWizardData] = useState<Partial<DocumentWizardSnapshot> | null>(null);
  const [activeRecordId, setActiveRecordId] = useState<string>(recordId);
  const [isApprovedRecord, setIsApprovedRecord] = useState(false);

  const steps = useMemo(
    () => [
      { step: 1 as const, label: "Create Document", icon: FileText },
      { step: 2 as const, label: "Review", icon: Search },
      { step: 3 as const, label: "Approval", icon: CheckCircle },
    ],
    []
  );

  const listHref = orgId ? getDashboardPath(orgId, "documents") : "/";
  const canProceedStep1 = Boolean(formData.site && formData.processName);

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
          loginUserName: String(profileJson?.name ?? prev.loginUserName ?? ""),
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
    let ignore = false;
    async function loadExistingRecord() {
      if (!orgId || !recordId) return;
      setIsHydratingRecord(true);
      try {
        const res = await fetch(
          `/api/organization/${orgId}/documents?id=${encodeURIComponent(recordId)}&includeAll=1`,
          { credentials: "include" }
        );
        const json = res.ok ? await res.json() : { records: [] };
        if (ignore) return;
        const rows = Array.isArray(json?.records) ? json.records : [];
        const row = rows[0] as {
          form_data?: Partial<Step1FormData>;
          wizard_data?: Partial<DocumentWizardSnapshot>;
          workflow_status?: string;
        } | undefined;
        if (row?.form_data) {
          setFormData((prev) => ({
            ...prev,
            ...row.form_data,
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
    // User requested return to documents table after submit/draft.
    router.push("/documents");
  };

  const handleSubmitProceed = async (payload: DocumentSavePayload) => {
    let createdId = "";
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
    } catch {
      // Temporary fallback so users do not lose data while backend/table rollout continues.
      appendDocumentRecord(orgId || "tenant", "submitted", payload);
    }
    if (createdId) setActiveRecordId(createdId);
    setStep(2);
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
      setStep(3);
      return;
    }
    try {
      await fetch(`/api/organization/${orgId}/documents`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: activeRecordId,
          action: "review-submit",
          comments: payload.comments,
          decision: payload.decision,
        }),
      });
    } finally {
      setStep(3);
    }
  };

  const handleApproveFinish = async (payload: { comments: string; decision: "effective" | "ineffective" | null }) => {
    if (orgId && activeRecordId) {
      await fetch(`/api/organization/${orgId}/documents`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: activeRecordId,
          action: "approve",
          comments: payload.comments,
          decision: payload.decision,
        }),
      });
    }
    redirectToDocuments();
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
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStep(s)}
                  className={cn(
                    "rounded-lg border px-4 py-3 transition-all",
                    "flex flex-col items-center justify-center min-h-[92px] gap-2",
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
              canProceed={canProceedStep1 && !isHydratingRecord && !isViewMode}
              isViewMode={isViewMode}
              initialWizard={initialWizardData ?? undefined}
              onSubmitProceed={handleSubmitProceed}
              onSaveDraft={handleSaveDraft}
            />
          )}

          {step === 2 && (
            <ReviewDocumentStep
              title={formData.title}
              docType={formData.docType}
              site={formData.siteId || formData.site}
              processName={formData.processName}
              description={formData.description}
              processOwner={formData.processOwner}
              managementStandard={formData.managementStandard}
              clause={formData.clause}
              subClause={formData.subClause}
              processId={formData.processId}
              onBack={() => setStep(1)}
              onNext={handleReviewSubmit}
            />
          )}

          {step === 3 && (
            <ApprovalDocumentStep
              listHref={listHref}
              title={formData.title}
              docType={formData.docType}
              site={formData.siteId || formData.site}
              processName={formData.processName}
              processOwner={formData.processOwner}
              managementStandard={formData.managementStandard}
              clause={formData.clause}
              subClause={formData.subClause}
              processId={formData.processId}
              onBack={() => setStep(2)}
              onApprove={handleApproveFinish}
            />
          )}
        {/* </CardContent>
      </Card> */}
    </div>
  );
}


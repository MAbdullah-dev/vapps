"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar as DatePickerCalendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  DocumentSavePayload,
  DocumentWizardSnapshot,
  ProcessOption,
  SiteOption,
  StandardOption,
  Step1FormData,
} from "@/components/documents/types";
import {
  Calendar as CalendarIcon,
  Lock,
  Paperclip,
  RefreshCw,
  Save,
  Search,
  Send,
  Unlock,
} from "lucide-react";
import { format } from "date-fns";
import { cn, documentActorMatches } from "@/lib/utils";
import { docAlertInfo, docSelectionActive, docSelectionIdle } from "@/lib/document-ui-classes";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { useTranslate } from "@/components/providers/translation-provider";
import {
  applyDraftPlaceholderRef,
  bumpVersionInRef,
  DRAFT_DOC_NUMBER,
  isDraftPlaceholderRef,
  parseDocNumberSegment,
} from "@/lib/documentRef";
import { resolveManagementStandardLabel } from "@/lib/management-standard-label";
import { toast } from "sonner";

function managementStandardLabel(
  value: string,
  t: (text: string) => string,
  standards: StandardOption[]
): string {
  const nameById = Object.fromEntries(standards.map((s) => [s.id, s.name]));
  const resolved = resolveManagementStandardLabel(value, nameById);
  if (resolved !== "-") return t(resolved);
  return t("—");
}

function classificationTypeLabel(c: "P" | "F" | "EXT", t: (text: string) => string): string {
  if (c === "P") return t("P — Maintained Doc");
  if (c === "F") return t("F — Retained Record");
  return t("EXT — External Doc");
}

function limitToWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ");
}

function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

function isRequiredValueFilled(value: string): boolean {
  return value.trim().length > 0;
}

function requiredInputClass(hasError: boolean): string {
  return cn(hasError && "border-destructive focus-visible:ring-destructive");
}

function DocFieldError({
  show,
  t,
  message,
}: {
  show: boolean;
  t: (text: string) => string;
  message?: string;
}) {
  if (!show) return null;
  return <p className="text-xs text-destructive">{message ?? t("This field is required")}</p>;
}

function extractProcessCode(raw: string): string {
  // Attempts to extract process segment codes like "P1", "P2", ... from process names.
  const match = raw.match(/\b(P\d+)\b/i);
  if (match?.[1]) return match[1].toUpperCase();
  return raw.trim() ? raw.trim().slice(0, 4).toUpperCase() : "P1";
}

type ProcessOwnerMemberOption = {
  id: string;
  name: string;
  leadershipTier?: string;
  isOwner?: boolean;
  status?: "Active" | "Invited";
};

type CreateDocumentStepProps = {
  orgId: string;
  formData: Step1FormData;
  title: string;
  setTitle: (value: string) => void;
  docType: string;
  setDocType: (value: string) => void;
  site: string;
  setSite: (value: string) => void;
  processName: string;
  setProcessName: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  loginUserName: string;
  loginUserId: string;
  organizationName: string;
  organizationIdentification: string;
  industryType: string;
  siteId: string;
  location: string;
  processId: string;
  processOwner: string;
  setProcessOwner: (value: string) => void;
  processOwnerUserId: string;
  setProcessOwnerUserId: (value: string) => void;
  approverName: string;
  setApproverName: (value: string) => void;
  approverUserId: string;
  setApproverUserId: (value: string) => void;
  managementStandard: string;
  setManagementStandard: (value: string) => void;
  clause: string;
  setClause: (value: string) => void;
  subClause: string;
  setSubClause: (value: string) => void;
  standards: StandardOption[];
  clauseOptions: string[];
  subClauseOptions: string[];
  isLoadingStandards: boolean;
  isLoadingClauses: boolean;
  sites: SiteOption[];
  processes: ProcessOption[];
  isLoadingContext: boolean;
  isLoadingSites: boolean;
  isLoadingProcesses: boolean;
  /** When true, site is fixed from the logged-in user's single site assignment. */
  siteSelectionLocked?: boolean;
  /** When true, process is fixed from the user's single process at that site. */
  processSelectionLocked?: boolean;
  canProceed: boolean;
  isViewMode?: boolean;
  initialWizard?: Partial<DocumentWizardSnapshot>;
  /** When editing, used to keep Doc# in sync with saved preview_doc_ref. */
  initialPreviewDocRef?: string;
  /** True while workflow_status is still draft (Doc# stays D0). */
  isDraftRecord?: boolean;
  /** Present when editing an existing record — skips allocating a new D#. */
  recordId?: string;
  /** When false, user already has another draft — publish is allowed but save-as-draft is not. */
  canSaveDraft?: boolean;
  onSubmitProceed: (payload: DocumentSavePayload) => void | Promise<void>;
  onSaveDraft: (payload: DocumentSavePayload) => void | Promise<void>;
};

export default function CreateDocumentStep({
  orgId,
  formData,
  title,
  setTitle,
  docType,
  setDocType,
  site,
  setSite,
  processName,
  setProcessName,
  description,
  setDescription,
  loginUserName,
  loginUserId,
  organizationName,
  organizationIdentification,
  industryType,
  siteId,
  location,
  processId,
  processOwner,
  setProcessOwner,
  processOwnerUserId,
  setProcessOwnerUserId,
  approverName,
  setApproverName,
  approverUserId,
  setApproverUserId,
  managementStandard,
  setManagementStandard,
  clause,
  setClause,
  subClause,
  setSubClause,
  standards,
  clauseOptions,
  subClauseOptions,
  isLoadingStandards,
  isLoadingClauses,
  sites,
  processes,
  isLoadingContext,
  isLoadingSites,
  isLoadingProcesses,
  siteSelectionLocked = false,
  processSelectionLocked = false,
  canProceed,
  isViewMode = false,
  initialWizard,
  initialPreviewDocRef,
  isDraftRecord = false,
  recordId,
  canSaveDraft = true,
  onSubmitProceed,
  onSaveDraft,
}: CreateDocumentStepProps) {
  const { t } = useTranslate();
  const [pathDocNumber, setPathDocNumber] = useState(DRAFT_DOC_NUMBER);
  const [previousRefNumber, setPreviousRefNumber] = useState("");
  const [priorityLevel, setPriorityLevel] = useState<"high" | "low">("high");
  const [documentClassification, setDocumentClassification] = useState<"P" | "F" | "EXT">("P");
  const [actionType, setActionType] = useState<"create" | "revise" | "obsolete">("create");
  const [reviseSubAction, setReviseSubAction] = useState<"update" | "transfer">("update");
  const [searchCurrentDocumentRef, setSearchCurrentDocumentRef] = useState("");
  const [revisionComment, setRevisionComment] = useState("");
  const [documentEditorContent, setDocumentEditorContent] = useState("");
  const [externalDocumentFileName, setExternalDocumentFileName] = useState("");
  const [restriction, setRestriction] = useState<"unlocked" | "locked">("unlocked");
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [filePin, setFilePin] = useState("");
  const [confirmFilePin, setConfirmFilePin] = useState("");
  const [pinError, setPinError] = useState("");
  const [reasons, setReasons] = useState<string[]>([]);
  const [reasonComment, setReasonComment] = useState("");
  const [affectsOtherDocs, setAffectsOtherDocs] = useState<"yes" | "no">("no");
  const [riskLevel, setRiskLevel] = useState<"high" | "medium" | "low">("low");
  const [riskComments, setRiskComments] = useState("");
  const [trainingRequired, setTrainingRequired] = useState<"yes" | "no">("no");
  const [trainingDetails, setTrainingDetails] = useState("");
  const [planDate, setPlanDate] = useState("");
  const [actualDate, setActualDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const parseDateInput = (value: string): Date | undefined => {
    if (!value) return undefined;
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return undefined;
    return new Date(year, month - 1, day);
  };

  const toDateInput = (value?: Date): string => {
    if (!value) return "";
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [transferSearchRef, setTransferSearchRef] = useState("");
  const [transferTargetSite, setTransferTargetSite] = useState("S1");
  const [transferTargetSiteId, setTransferTargetSiteId] = useState("");
  const [transferTargetProcess, setTransferTargetProcess] = useState("P1");
  const [transferTargetProcessId, setTransferTargetProcessId] = useState("");
  const [transferProcessOptions, setTransferProcessOptions] = useState<
    Array<{ id: string; name: string; code: string }>
  >([]);
  const [isLoadingTransferProcesses, setIsLoadingTransferProcesses] = useState(false);
  const [transferStandardChange, setTransferStandardChange] = useState("");
  const [transferDocumentClass, setTransferDocumentClass] = useState<"P" | "F" | "EXT">("P");
  const [transferInitiatorRequest, setTransferInitiatorRequest] = useState("");
  const [originatorConsent, setOriginatorConsent] = useState<"accepted" | "declined" | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  const [processOwnerOptions, setProcessOwnerOptions] = useState<ProcessOwnerMemberOption[]>([]);
  const [approverOptions, setApproverOptions] = useState<ProcessOwnerMemberOption[]>([]);
  const [isLoadingProcessOwners, setIsLoadingProcessOwners] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function loadProcessOwnerCandidates() {
      if (!orgId) {
        setProcessOwnerOptions([]);
        setApproverOptions([]);
        setIsLoadingProcessOwners(false);
        return;
      }
      setIsLoadingProcessOwners(true);
      try {
        const res = await fetch(`/api/organization/${orgId}/members`, { credentials: "include" });
        const json = res.ok ? await res.json() : {};
        if (ignore) return;
        const raw = Array.isArray(json?.teamMembers)
          ? (json.teamMembers as ProcessOwnerMemberOption[])
          : Array.isArray(json?.members)
            ? (json.members as ProcessOwnerMemberOption[])
            : [];
        const filtered = raw.filter((m) => {
          const tier = String(m.leadershipTier ?? "").trim().toLowerCase();
          const isTopOrMiddle = tier === "top" || tier === "operational" || tier === "middle";
          const isActive = (m.status ?? "Active") === "Active";
          const isCreatingUser = documentActorMatches(loginUserId, loginUserName, m.id, m.name);
          return isTopOrMiddle && isActive && !m.isOwner && !isCreatingUser;
        });
        setProcessOwnerOptions(filtered);

        const ownerToken = (processOwner ?? "").trim().toLowerCase();
        const ownerId = (processOwnerUserId ?? "").trim();
        const approverFiltered = raw.filter((m) => {
          const tier = String(m.leadershipTier ?? "").trim().toLowerCase();
          const isTopOnly = tier === "top";
          const isOrgOwner = Boolean(m.isOwner);
          const isActive = (m.status ?? "Active") === "Active";
          const currentName = (m.name ?? "").trim().toLowerCase();
          const isProcessOwnerPick =
            (ownerToken.length > 0 && currentName === ownerToken) ||
            (ownerId.length > 0 && m.id === ownerId);
          const isCreatingUser = documentActorMatches(loginUserId, loginUserName, m.id, m.name);
          // Top-tier approvers include org owner (previously excluded via !m.isOwner).
          const canBeApprover = isTopOnly || isOrgOwner;
          return canBeApprover && isActive && !isProcessOwnerPick && !isCreatingUser;
        });
        setApproverOptions(approverFiltered);
      } catch {
        if (!ignore) {
          setProcessOwnerOptions([]);
          setApproverOptions([]);
        }
      } finally {
        if (!ignore) setIsLoadingProcessOwners(false);
      }
    }
    void loadProcessOwnerCandidates();
    return () => {
      ignore = true;
    };
  }, [orgId, processOwner, processOwnerUserId, loginUserName, loginUserId]);

  useEffect(() => {
    if (documentActorMatches(loginUserId, loginUserName, processOwnerUserId, processOwner)) {
      setProcessOwner("");
      setProcessOwnerUserId("");
    }
  }, [loginUserId, loginUserName, processOwnerUserId, processOwner, setProcessOwner, setProcessOwnerUserId]);

  useEffect(() => {
    if (documentActorMatches(loginUserId, loginUserName, approverUserId, approverName)) {
      setApproverName("");
      setApproverUserId("");
    }
  }, [loginUserId, loginUserName, approverUserId, approverName, setApproverName, setApproverUserId]);

  useEffect(() => {
    const a = approverName.trim();
    const o = processOwner.trim();
    const sameById =
      processOwnerUserId.trim().length > 0 &&
      approverUserId.trim().length > 0 &&
      processOwnerUserId === approverUserId;
    const sameByName = a && o && a.toLowerCase() === o.toLowerCase();
    if (sameById || sameByName) {
      setApproverName("");
      setApproverUserId("");
    }
  }, [
    processOwner,
    approverName,
    processOwnerUserId,
    approverUserId,
    setApproverName,
    setApproverUserId,
  ]);

  useEffect(() => {
    if (!processOwner.trim()) return;
    if (processOwnerUserId.trim()) return;
    const m = processOwnerOptions.find((x) => x.name === processOwner);
    if (m?.id) setProcessOwnerUserId(m.id);
  }, [processOwner, processOwnerUserId, processOwnerOptions, setProcessOwnerUserId]);

  useEffect(() => {
    if (!approverName.trim()) return;
    if (approverUserId.trim()) return;
    const m = approverOptions.find((x) => x.name === approverName);
    if (m?.id) setApproverUserId(m.id);
  }, [approverName, approverUserId, approverOptions, setApproverUserId]);

  const handleProcessOwnerChange = (name: string) => {
    setProcessOwner(name);
    const m = processOwnerOptions.find((x) => x.name === name);
    setProcessOwnerUserId(m?.id ?? "");
    if (formErrors.processOwner) setFormErrors((p) => ({ ...p, processOwner: false }));
  };

  const handleApproverChange = (name: string) => {
    setApproverName(name);
    const m = approverOptions.find((x) => x.name === name);
    setApproverUserId(m?.id ?? "");
    if (formErrors.approver) setFormErrors((p) => ({ ...p, approver: false }));
  };

  useEffect(() => {
    if (!initialWizard) return;
    if (typeof initialWizard.previousRefNumber === "string") setPreviousRefNumber(initialWizard.previousRefNumber);
    if (initialWizard.priorityLevel === "high" || initialWizard.priorityLevel === "low") setPriorityLevel(initialWizard.priorityLevel);
    if (initialWizard.documentClassification === "P" || initialWizard.documentClassification === "F" || initialWizard.documentClassification === "EXT") setDocumentClassification(initialWizard.documentClassification);
    if (initialWizard.actionType === "create" || initialWizard.actionType === "revise" || initialWizard.actionType === "obsolete") setActionType(initialWizard.actionType);
    if (initialWizard.reviseSubAction === "update" || initialWizard.reviseSubAction === "transfer") setReviseSubAction(initialWizard.reviseSubAction);
    if (typeof initialWizard.searchCurrentDocumentRef === "string") setSearchCurrentDocumentRef(initialWizard.searchCurrentDocumentRef);
    if (typeof initialWizard.revisionComment === "string") setRevisionComment(initialWizard.revisionComment);
    if (typeof initialWizard.documentEditorContent === "string") setDocumentEditorContent(initialWizard.documentEditorContent);
    if (typeof initialWizard.externalDocumentFileName === "string") setExternalDocumentFileName(initialWizard.externalDocumentFileName);
    if (initialWizard.restriction === "locked" || initialWizard.restriction === "unlocked") setRestriction(initialWizard.restriction);
    if (typeof initialWizard.filePin === "string") setFilePin(initialWizard.filePin);
    if (typeof initialWizard.confirmFilePin === "string") setConfirmFilePin(initialWizard.confirmFilePin);
    if (typeof initialWizard.pinError === "string") setPinError(initialWizard.pinError);
    if (Array.isArray(initialWizard.reasons)) setReasons(initialWizard.reasons.filter((x) => typeof x === "string"));
    if (typeof initialWizard.reasonComment === "string") setReasonComment(initialWizard.reasonComment);
    if (initialWizard.affectsOtherDocs === "yes" || initialWizard.affectsOtherDocs === "no") setAffectsOtherDocs(initialWizard.affectsOtherDocs);
    if (initialWizard.riskLevel === "high" || initialWizard.riskLevel === "medium" || initialWizard.riskLevel === "low") setRiskLevel(initialWizard.riskLevel);
    if (typeof initialWizard.riskComments === "string") setRiskComments(initialWizard.riskComments);
    if (initialWizard.trainingRequired === "yes" || initialWizard.trainingRequired === "no") setTrainingRequired(initialWizard.trainingRequired);
    if (typeof initialWizard.trainingDetails === "string") setTrainingDetails(initialWizard.trainingDetails);
    if (typeof initialWizard.planDate === "string") setPlanDate(initialWizard.planDate);
    if (typeof initialWizard.actualDate === "string") setActualDate(initialWizard.actualDate);
    if (typeof initialWizard.endDate === "string") setEndDate(initialWizard.endDate);
    if (typeof initialWizard.transferSearchRef === "string") setTransferSearchRef(initialWizard.transferSearchRef);
    if (typeof initialWizard.transferTargetSite === "string") setTransferTargetSite(initialWizard.transferTargetSite);
    if (typeof initialWizard.transferTargetSiteId === "string") setTransferTargetSiteId(initialWizard.transferTargetSiteId);
    if (typeof initialWizard.transferTargetProcess === "string") setTransferTargetProcess(initialWizard.transferTargetProcess);
    if (typeof initialWizard.transferTargetProcessId === "string") setTransferTargetProcessId(initialWizard.transferTargetProcessId);
    if (Array.isArray(initialWizard.transferProcessOptions)) {
      setTransferProcessOptions(
        initialWizard.transferProcessOptions.filter(
          (x): x is { id: string; name: string; code: string } =>
            !!x && typeof x.id === "string" && typeof x.name === "string" && typeof x.code === "string"
        )
      );
    }
    if (typeof initialWizard.transferStandardChange === "string") setTransferStandardChange(initialWizard.transferStandardChange);
    if (initialWizard.transferDocumentClass === "P" || initialWizard.transferDocumentClass === "F" || initialWizard.transferDocumentClass === "EXT") setTransferDocumentClass(initialWizard.transferDocumentClass);
    if (typeof initialWizard.transferInitiatorRequest === "string") setTransferInitiatorRequest(initialWizard.transferInitiatorRequest);
    if (initialWizard.originatorConsent === "accepted" || initialWizard.originatorConsent === "declined" || initialWizard.originatorConsent === null) setOriginatorConsent(initialWizard.originatorConsent);
    if (
      typeof initialWizard.documentNumberSegment === "string" &&
      !isDraftRecord &&
      !isDraftPlaceholderRef(initialPreviewDocRef ?? "")
    ) {
      const m = /^D(\d+)$/i.exec(initialWizard.documentNumberSegment.trim());
      if (m) setPathDocNumber(`D${m[1]}`);
    }
  }, [initialWizard, isDraftRecord, initialPreviewDocRef]);

  const reasonOptions = [
    "4M Change",
    "External Audit Findings",
    "ISO Standard Requirements",
    "New Equipment Purchased",
    "Process Efficiency",
    "Customer Requirement",
    "Internal Audit Findings",
    "Organizational Requirements",
    "New Service Acquired",
    "Other",
  ];

  const toggleReason = (reason: string) => {
    setReasons((prev) => {
      const next = prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason];
      if (next.length > 0 && formErrors.reasons) setFormErrors((p) => ({ ...p, reasons: false }));
      return next;
    });
  };

  const isReviseUpdate = actionType === "revise" && reviseSubAction === "update";
  const isReviseTransfer = actionType === "revise" && reviseSubAction === "transfer";

  const documentEditorPlaceholder = isReviseTransfer
    ? t("Document body for the transferred record…")
    : isReviseUpdate
      ? t("Document body appears here after revision…")
      : t("Enter or paste document content…");

  const currentSiteDisplay = siteId.trim() || "S1";
  const currentProcessDisplay = processName.trim() || processId.trim() || "P1";
  const currentProcessCode = extractProcessCode(currentProcessDisplay);
  const lockedSiteLabel = (() => {
    const matched = sites.find((s) => s.id === site);
    if (!matched) return isLoadingSites ? t("Loading sites...") : site || "";
    return matched.code ? `${matched.code} - ${matched.name}` : matched.name;
  })();
  const lockedProcessLabel =
    processes.find((p) => p.id === processId)?.name ||
    processName ||
    (isLoadingProcesses ? t("Loading processes...") : "");
  const transferSiteCodes = useMemo(() => {
    const codes = Array.from(
      new Set(sites.map((s) => s.code).filter((c) => Boolean(c && c.trim().length > 0)))
    );
    return codes.length > 0 ? codes : [currentSiteDisplay];
  }, [sites, currentSiteDisplay]);

  // Map transfer target site code (e.g. "S1") => its DB site id (uuid).
  useEffect(() => {
    if (!sites.length) return;
    const matched = sites.find((s) => s.code === transferTargetSite);
    setTransferTargetSiteId(matched?.id ?? "");
  }, [sites, transferTargetSite]);

  // Dynamically load processes for the selected transfer target site.
  useEffect(() => {
    if (!isReviseTransfer) return;
    if (!orgId) return;
    if (!transferTargetSiteId) return;

    let ignore = false;

    async function loadTransferProcesses() {
      setIsLoadingTransferProcesses(true);
      try {
        const shouldUseCurrentSiteProcesses = transferTargetSiteId === site;

        if (shouldUseCurrentSiteProcesses) {
          const fallback = processes.map((p) => ({
            id: p.id,
            name: p.name,
            code: extractProcessCode(p.name),
          }));
          if (ignore) return;
          setTransferProcessOptions(fallback);
          const selected = fallback.find((x) => x.code === transferTargetProcess);
          const first = fallback[0];
          if (!selected && first) {
            setTransferTargetProcess(first.code);
            setTransferTargetProcessId(first.id);
          } else if (selected) {
            setTransferTargetProcessId(selected.id);
          }
          return;
        }

        const res = await fetch(
          `/api/organization/${orgId}/processes?siteId=${encodeURIComponent(transferTargetSiteId)}`,
          { credentials: "include" }
        );
        const json = res.ok ? await res.json() : { processes: [] };
        const typed = (json ?? {}) as { processes?: Array<{ id: string; name: string }> };
        const loaded = (typed.processes ?? []).map((p) => ({
          id: String(p.id),
          name: String(p.name ?? ""),
          code: extractProcessCode(String(p.name ?? "")),
        }));

        if (ignore) return;
        setTransferProcessOptions(loaded);

        const selected = loaded.find((x) => x.code === transferTargetProcess);
        const first = loaded[0];
        if (!selected && first) {
          setTransferTargetProcess(first.code);
          setTransferTargetProcessId(first.id);
        } else if (selected) {
          setTransferTargetProcessId(selected.id);
        }
      } finally {
        if (!ignore) setIsLoadingTransferProcesses(false);
      }
    }

    void loadTransferProcesses();
    return () => {
      ignore = true;
    };
  }, [
    isReviseTransfer,
    orgId,
    transferTargetSiteId,
    processes,
    site,
    transferTargetProcess,
  ]);

  useEffect(() => {
    const ref = initialPreviewDocRef?.trim();
    if (!ref) return;
    if (isDraftRecord || isDraftPlaceholderRef(ref)) {
      setPathDocNumber(DRAFT_DOC_NUMBER);
      return;
    }
    const parsed = parseDocNumberSegment(ref);
    if (parsed) setPathDocNumber(parsed);
  }, [initialPreviewDocRef, isDraftRecord]);

  const previewDocRef = useMemo(() => {
    if (isReviseUpdate && searchCurrentDocumentRef.trim()) {
      return bumpVersionInRef(searchCurrentDocumentRef.trim());
    }
    if (isReviseTransfer) {
      const y = new Date().getFullYear();
      const cls = transferDocumentClass;
      const docSeg = cls === "EXT" ? "EXT" : pathDocNumber;
      return `Doc/${y}/${transferTargetSite}/${transferTargetProcess}/${cls}/${docSeg}/v1`;
    }
    const base = `Doc/${new Date().getFullYear()}/${siteId || "S1"}/${currentProcessCode || "P1"}/${documentClassification}/${pathDocNumber}/v1`;
    if (isDraftRecord || (recordId && isDraftPlaceholderRef(initialPreviewDocRef ?? ""))) {
      return applyDraftPlaceholderRef(base);
    }
    return base;
  }, [
    isReviseUpdate,
    isReviseTransfer,
    searchCurrentDocumentRef,
    pathDocNumber,
    transferDocumentClass,
    transferTargetSite,
    transferTargetProcess,
    siteId,
    currentProcessCode,
    documentClassification,
    isDraftRecord,
    recordId,
    initialPreviewDocRef,
  ]);

  const buildSavePayload = (): DocumentSavePayload => ({
    savedAt: new Date().toISOString(),
    previewDocRef,
    formData: { ...formData },
    wizard: {
      previousRefNumber,
      priorityLevel,
      documentClassification,
      actionType,
      isReviseUpdate,
      isReviseTransfer,
      reviseSubAction,
      searchCurrentDocumentRef,
      revisionComment,
      documentEditorContent,
      externalDocumentFileName,
      restriction,
      hasPinSet: restriction === "locked" && filePin.length > 0,
      filePin,
      confirmFilePin,
      pinError,
      reasons,
      reasonComment,
      affectsOtherDocs,
      riskLevel,
      riskComments,
      trainingRequired,
      trainingDetails,
      planDate,
      actualDate,
      endDate,
      transferSearchRef,
      transferTargetSite,
      transferTargetSiteId,
      transferTargetProcess,
      transferTargetProcessId,
      transferProcessOptions,
      transferStandardChange,
      transferDocumentClass,
      transferInitiatorRequest,
      originatorConsent,
      documentNumberSegment: pathDocNumber,
    },
  });

  const flowTitle =
    actionType === "create" ? t("Create") : actionType === "revise" ? t("Revise") : t("Obsolete");

  const isReviseUpdateReady =
    !isReviseUpdate ||
    (searchCurrentDocumentRef.trim().length > 0 && reasons.length > 0);

  const isReviseTransferReady =
    !isReviseTransfer ||
    (transferSearchRef.trim().length > 0 &&
      originatorConsent !== null &&
      Boolean(transferTargetSite.trim()) &&
      Boolean(transferTargetProcess.trim()) &&
      transferProcessOptions.some((p) => p.code === transferTargetProcess));

  /** Resubmit after review/approval return — do not block on revise sub-flow fields. */
  const bypassReviseSubmitGuards =
    formData.correctionPhase === "awaiting_creator_after_review" ||
    formData.correctionPhase === "awaiting_reviewer_after_approval";

  const reviseSubmitGuardsSatisfied =
    bypassReviseSubmitGuards || (isReviseUpdateReady && isReviseTransferReady);

  const validateDocumentForm = (): boolean => {
    if (isViewMode) return true;
    const errors: Record<string, boolean> = {
      site: !site?.trim(),
      process: !processId?.trim(),
      processOwner: !isRequiredValueFilled(processOwner),
      approver: !isRequiredValueFilled(approverName),
      title: !isRequiredValueFilled(title),
      managementStandard: !isRequiredValueFilled(managementStandard),
    };

    if (!bypassReviseSubmitGuards) {
      if (isReviseUpdate) {
        errors.searchCurrentDocumentRef = !searchCurrentDocumentRef.trim();
        errors.reasons = reasons.length === 0;
      }
      if (isReviseTransfer) {
        errors.transferSearchRef = !transferSearchRef.trim();
        errors.originatorConsent = originatorConsent === null;
        errors.transferTargetProcess =
          !transferTargetProcess.trim() ||
          !transferProcessOptions.some((p) => p.code === transferTargetProcess);
      }
    }

    if (restriction === "locked" && !filePin) {
      errors.documentPin = true;
    }

    if (documentClassification === "EXT" && !externalDocumentFileName.trim()) {
      errors.externalFile = true;
    }

    if (Object.values(errors).some(Boolean)) {
      setFormErrors(errors);
      toast.error(t("Please fill in all required fields."));
      return false;
    }
    setFormErrors({});
    return true;
  };

  const handleSaveDraftClick = async () => {
    if (isSaving || isViewMode) return;
    if (!validateDocumentForm()) return;
    setIsSaving(true);
    try {
      await onSaveDraft(buildSavePayload());
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitProceedClick = async () => {
    if (isSaving || isViewMode) return;
    if (!validateDocumentForm()) return;
    if (!reviseSubmitGuardsSatisfied) {
      toast.error(t("Please complete all required revision or transfer fields."));
      return;
    }
    setIsSaving(true);
    try {
      await onSubmitProceed(buildSavePayload());
    } finally {
      setIsSaving(false);
    }
  };

  const previewTypeSubtitle =
    documentClassification === "P"
      ? t("Maintained Doc")
      : documentClassification === "F"
        ? t("Retained Record")
        : t("External Doc");

  const previewRiskLabel =
    riskLevel === "high" ? t("High") : riskLevel === "medium" ? t("Medium") : t("Low");

  const handleLockSelection = () => {
    setFilePin("");
    setConfirmFilePin("");
    setPinError("");
    setIsPinDialogOpen(true);
  };

  const handleEditPin = () => {
    setFilePin("");
    setConfirmFilePin("");
    setPinError("");
    setIsPinDialogOpen(true);
  };

  const saveFilePin = () => {
    const pinPattern = /^\d{4,8}$/;
    if (!pinPattern.test(filePin)) {
      setPinError("PIN must be 4 to 8 digits.");
      return;
    }
    if (filePin !== confirmFilePin) {
      setPinError("PIN and confirm PIN do not match.");
      return;
    }
    setRestriction("locked");
    setIsPinDialogOpen(false);
    if (formErrors.documentPin) setFormErrors((p) => ({ ...p, documentPin: false }));
  };

  return (
    <>
      {/* First card under Step 1: Action Selection — UI temporarily hidden
      <Card className="py-4">
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-xl font-semibold text-foreground">{t("Action Selection")}</h4>
            <p className="text-sm text-muted-foreground">{t("Select one action only (mutually exclusive)")}</p>
          </div>

          <div className="space-y-2">
            <Label>{t("Action Type*")}</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { value: "create" as const, label: t("Create") },
                { value: "revise" as const, label: t("Revise") },
                { value: "obsolete" as const, label: t("Obsolete") },
              ].map((item) => {
                const isActive = actionType === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setActionType(item.value)}
                    className={`rounded-lg border p-3 text-center font-medium transition-colors ${isActive
                        ? cn(docSelectionActive, "font-medium")
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                      }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {actionType === "revise" ? (
            <div className="space-y-2">
              <Label>{t("Revise Sub-Action")}</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { value: "update" as const, label: t("Revise -> Update") },
                  { value: "transfer" as const, label: t("Revise -> Transfer") },
                ].map((item) => {
                  const isActive = reviseSubAction === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => {
                        setReviseSubAction(item.value);
                        if (item.value === "transfer") {
                        // Start transfer from current site/process by default.
                        setTransferTargetSite(currentSiteDisplay);
                        setTransferTargetProcess(currentProcessCode);
                        setTransferTargetProcessId("");
                        setTransferProcessOptions([]);

                        // Reset transfer-specific fields.
                        setTransferSearchRef("");
                        setTransferStandardChange("");
                        setTransferInitiatorRequest("");
                        setOriginatorConsent(null);

                          setTransferDocumentClass(documentClassification);
                          if (documentClassification === "P" || documentClassification === "F") {
                            setDocType(documentClassification);
                          }
                        }
                        if (item.value === "update") {
                          // Fresh revision context.
                          setSearchCurrentDocumentRef("");
                          setReasons([]);
                          setRevisionComment("");
                        }
                      }}
                      className={`rounded-lg border p-3 text-center font-medium transition-colors ${isActive
                          ? cn(docSelectionActive, "font-medium")
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                        }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
      */}

      <Card className="py-4">
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-3xl font-semibold text-foreground">{flowTitle}</h3>
            <p className="text-sm text-muted-foreground">{t("Start Procedure(P) or Form(F)!")}</p>
          </div>

          <div className="space-y-1 pt-2">
            <h4 className="text-xl font-semibold text-foreground">{t("Identity Information")}</h4>
            <p className="text-sm text-muted-foreground">
              {t("Auto-generated and basic organizational data")}
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <h5 className="text-lg font-semibold text-foreground">{t("User Information")}</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="login-user-name">{t("Name (Login User)")}</Label>
                  <Input
                    id="login-user-name"
                    value={loginUserName}
                    readOnly
                    className="bg-muted text-muted-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organization-name">{t("Organization Name")}</Label>
                  <Input
                    id="organization-name"
                    value={organizationName}
                    readOnly
                    className="bg-muted text-muted-foreground"
                    placeholder={t("Organization name")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organization-identification">{t("Organization Identification")}</Label>
                  <Input
                    id="organization-identification"
                    value={organizationIdentification}
                    readOnly
                    className="bg-muted text-muted-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry-type">{t("Industry Type (NAICS Code)")}</Label>
                  <Input
                    id="industry-type"
                    value={industryType}
                    readOnly
                    className="bg-muted text-muted-foreground"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-border" />

            <div className="space-y-3">
              <h5 className="text-lg font-semibold text-foreground">{t("Site Information")}</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="doc-site">
                    {t("Site / Unit *")}{" "}
                    {siteSelectionLocked ? (
                      <span className="text-xs font-normal text-muted-foreground">
                        {t("(from your profile)")}
                      </span>
                    ) : null}
                  </Label>
                  {siteSelectionLocked || isViewMode ? (
                    <Input
                      id="doc-site"
                      value={lockedSiteLabel}
                      readOnly
                      className={cn(
                        "bg-muted text-muted-foreground",
                        requiredInputClass(!!formErrors.site)
                      )}
                      placeholder={
                        isLoadingSites ? t("Loading sites...") : t("Assigned site")
                      }
                    />
                  ) : (
                    <Select
                      value={site}
                      onValueChange={(v) => {
                        setSite(v);
                        if (formErrors.site) setFormErrors((p) => ({ ...p, site: false }));
                      }}
                      disabled={isLoadingContext || isLoadingSites}
                    >
                      <SelectTrigger id="doc-site" className={cn("w-full", requiredInputClass(!!formErrors.site))}>
                        <SelectValue
                          placeholder={
                            isLoadingSites ? t("Loading sites...") : t("Select site")
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {sites.map((siteOption) => (
                          <SelectItem key={siteOption.id} value={siteOption.id}>
                            {siteOption.code ? `${siteOption.code} - ${siteOption.name}` : siteOption.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <DocFieldError show={!!formErrors.site} t={t} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="site-id">{t("Site ID")}</Label>
                  <Input
                    id="site-id"
                    value={siteId}
                    readOnly
                    className="bg-muted text-muted-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">{t("Location (factory / office)")}</Label>
                  <Input
                    id="location"
                    value={location}
                    readOnly
                    className="bg-muted text-muted-foreground"
                    placeholder={t("e.g., Main Factory")}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-border" />

            <div className="space-y-3">
              <h5 className="text-lg font-semibold text-foreground">{t("Process Area")}</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="doc-process">
                    {t("Process / Area *")}{" "}
                    {processSelectionLocked ? (
                      <span className="text-xs font-normal text-muted-foreground">
                        {t("(from your profile)")}
                      </span>
                    ) : null}
                  </Label>
                  {processSelectionLocked || isViewMode ? (
                    <Input
                      id="doc-process"
                      value={lockedProcessLabel}
                      readOnly
                      className={cn(
                        "bg-muted text-muted-foreground",
                        requiredInputClass(!!formErrors.process)
                      )}
                      placeholder={
                        isLoadingProcesses ? t("Loading processes...") : t("Assigned process")
                      }
                    />
                  ) : (
                    <Select
                      value={processId}
                      onValueChange={(v) => {
                        setProcessName(v);
                        if (formErrors.process) setFormErrors((p) => ({ ...p, process: false }));
                      }}
                      disabled={!site || isLoadingProcesses}
                    >
                      <SelectTrigger id="doc-process" className={cn("w-full", requiredInputClass(!!formErrors.process))}>
                        <SelectValue
                          placeholder={
                            !site
                              ? t("Select site first")
                              : isLoadingProcesses
                                ? t("Loading processes...")
                                : t("Select process")
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {processes.map((processOption) => (
                          <SelectItem key={processOption.id} value={processOption.id}>
                            {processOption.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <DocFieldError show={!!formErrors.process} t={t} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="process-id">{t("Process ID")}</Label>
                  <Input
                    id="process-id"
                    value={currentProcessCode}
                    readOnly
                    className="bg-muted text-muted-foreground"
                    placeholder={t("Auto-filled")}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-border" />

            <div className="space-y-3">
              <h5 className="text-lg font-semibold text-foreground">{t("Process Owner & Approver")}</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="process-owner">{t("Select Document Reviewer *")}</Label>
                  <Select
                    value={processOwner || undefined}
                    onValueChange={handleProcessOwnerChange}
                    disabled={isViewMode || isLoadingProcessOwners}
                  >
                    <SelectTrigger id="process-owner" className={cn("w-full", requiredInputClass(!!formErrors.processOwner))}>
                      <SelectValue
                        placeholder={
                          isLoadingProcessOwners ? t("Loading users...") : t("Select process owner")
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {processOwner.trim() &&
                      !processOwnerOptions.some((m) => m.name === processOwner) ? (
                        <SelectItem key="__current-owner" value={processOwner}>
                          {processOwner}
                        </SelectItem>
                      ) : null}
                      {processOwnerOptions.length > 0 ? (
                        processOwnerOptions.map((member) => (
                          <SelectItem key={member.id} value={member.name}>
                            {member.name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          {t("No eligible top or middle-tier users available")}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <DocFieldError show={!!formErrors.processOwner} t={t} />
                  <p className="text-xs text-muted-foreground">
                    {t("Top/middle tier only. The person creating this document cannot be Process Owner.")}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc-approver">{t("Select Document Approver *")}</Label>
                  <Select
                    value={approverName || undefined}
                    onValueChange={handleApproverChange}
                    disabled={isViewMode || isLoadingProcessOwners}
                  >
                    <SelectTrigger id="doc-approver" className={cn("w-full", requiredInputClass(!!formErrors.approver))}>
                      <SelectValue
                        placeholder={
                          isLoadingProcessOwners ? t("Loading users...") : t("Select approver (top tier)")
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {approverName.trim() &&
                      !approverOptions.some((m) => m.name === approverName) ? (
                        <SelectItem key="__current-approver" value={approverName}>
                          {approverName}
                        </SelectItem>
                      ) : null}
                      {approverOptions.length > 0 ? (
                        approverOptions.map((member) => (
                          <SelectItem key={member.id} value={member.name}>
                            {member.name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          {t("No eligible top-tier approvers available")}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <DocFieldError show={!!formErrors.approver} t={t} />
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "Top-tier only. The person creating this document cannot be approver. The Process Owner cannot be approver."
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-border" />

            {!isReviseUpdate && !isReviseTransfer ? (
              <>
                <div className="space-y-3">
                  <h5 className="text-lg font-semibold text-foreground">{t("Previous Document Reference")}</h5>
                  <div className="space-y-2">
                    <Label htmlFor="previous-ref">{t("Old Reference Number (if any)")}</Label>
                    <Input
                      id="previous-ref"
                      value={previousRefNumber}
                      onChange={(e) => setPreviousRefNumber(e.target.value)}
                      placeholder={t("e.g., Doc/2024/S1/P2/P/D1/v1")}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("Enter previous document reference if this is a revision")}
                    </p>
                  </div>
                </div>

                <div className="border-t border-border" />
              </>
            ) : null}


            <div className="space-y-3">
              <h5 className="text-lg font-semibold text-foreground">{t("Document Details")}</h5>
              <div className="space-y-2">
                <Label htmlFor="doc-description">{t("Description")}</Label>
                <Textarea
                  id="doc-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("Write document scope...")}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Third card under Step 1: Change Request */}
      <Card className="py-4">
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-xl font-semibold text-foreground">{t("Change Request")}</h4>
            <p className="text-sm text-muted-foreground">{t("Document priority level")}</p>
          </div>

          <RadioGroup
            value={priorityLevel}
            onValueChange={(v) => setPriorityLevel(v as "high" | "low")}
            className="space-y-3"
          >
            <Label
              htmlFor="priority-high"
              className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer font-normal ${
                priorityLevel === "high"
                  ? docSelectionActive
                  : "border-border"
              }`}
            >
              <RadioGroupItem value="high" id="priority-high" className="mt-1" />
              <div>
                <p className="font-semibold text-foreground">{t("High (Strategic Documents)")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("Policy, Manual, Procedure, SOP, Governance documents")}
                </p>
              </div>
            </Label>

            <Label
              htmlFor="priority-low"
              className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer font-normal ${
                priorityLevel === "low"
                  ? docSelectionActive
                  : "border-border"
              }`}
            >
              <RadioGroupItem value="low" id="priority-low" className="mt-1" />
              <div>
                <p className="font-semibold text-foreground">{t("Low (Operational Records)")}</p>
                <p className="text-sm text-muted-foreground">{t("Forms, Checklists, Logs, Templates")}</p>
              </div>
            </Label>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Fourth card under Step 1: Document Type */}
      <Card className="py-4">
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-xl font-semibold text-foreground">{t("Document Type")}</h4>
            <p className="text-sm text-muted-foreground">{t("Select document classification")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { value: "P" as const, title: "P", subtitle: t("Maintained Doc") },
              { value: "F" as const, title: "F", subtitle: t("Retained Record") },
              { value: "EXT" as const, title: "EXT", subtitle: t("External Doc") },
            ].map((item) => {
              const isActive = documentClassification === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setDocumentClassification(item.value);
                    if (item.value === "P" || item.value === "F") {
                      setDocType(item.value);
                    }
                    if (item.value !== "EXT") {
                      setExternalDocumentFileName("");
                    }
                  }}
                  className={`rounded-lg border p-4 text-center transition-colors ${isActive
                      ? docSelectionActive
                      : "border-border bg-background hover:bg-muted"
                    }`}
                >
                  <p
                    className={`font-semibold ${isActive ? "text-primary" : "text-muted-foreground"
                      }`}
                  >
                    {item.title}
                  </p>
                  <p
                    className={`text-sm mt-1 ${isActive ? "text-primary" : "text-muted-foreground"
                      }`}
                  >
                    {item.subtitle}
                  </p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Revise → Update only: Revision Details (matches design 1.9) */}
      {isReviseUpdate ? (
        <Card className="py-4">
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-xl font-semibold text-foreground">{t("1.9 Revision Details")}</h4>
              <p className="text-sm text-muted-foreground">
                {t("Revision/Update — version increments (v1 → v2), previous version archived")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="search-current-doc">{t("Search Current Document (Required)")}</Label>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="search-current-doc"
                  value={searchCurrentDocumentRef}
                  onChange={(e) => {
                    setSearchCurrentDocumentRef(e.target.value);
                    if (formErrors.searchCurrentDocumentRef) setFormErrors((p) => ({ ...p, searchCurrentDocumentRef: false }));
                  }}
                  className={cn("pl-9", requiredInputClass(!!formErrors.searchCurrentDocumentRef))}
                  placeholder={t("e.g. Doc/2025/S1/P1/P/D1/v1")}
                />
              </div>
              <DocFieldError show={!!formErrors.searchCurrentDocumentRef} t={t} />
              <p className="text-xs text-muted-foreground">
                {t("Enter the existing document reference number to revise")}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{t("Reasons for Change (Required)")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("Select all applicable reasons (multiple selections allowed)")}
              </p>
              <div className={cn("flex flex-wrap gap-2 rounded-lg", formErrors.reasons && "ring-1 ring-destructive p-1")}>
                {reasonOptions.map((reason) => {
                  const isOn = reasons.includes(reason);
                  return (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => toggleReason(reason)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        isOn
                          ? cn(docSelectionActive, "font-medium")
                          : "border-border bg-background text-muted-foreground hover:bg-muted/30"
                      }`}
                    >
                      {t(reason)}
                    </button>
                  );
                })}
              </div>
              <DocFieldError show={!!formErrors.reasons} t={t} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="revision-comment">{t("Reasons / Comments")}</Label>
              <Textarea
                id="revision-comment"
                value={revisionComment}
                onChange={(e) =>
                  setRevisionComment(limitToWords(e.target.value, 50))
                }
                placeholder={t("Other (please specify integration, max 50 words)")}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t("Max 50 words — briefly explain the reason for this revision")}</span>
                <span>
                  {countWords(revisionComment)}/50 {t("words")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Revise → Transfer: 1.10 Transfer the Document (Manual) */}
      {isReviseTransfer ? (
        <Card className="py-4">
          <CardContent className="space-y-4">
            <div className={cn(docAlertInfo, "p-4")}>
              <div className="flex gap-3">
                <RefreshCw className="shrink-0 text-primary mt-0.5" size={20} />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {t("1.10 Transfer the Document (Manual)")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {t(
                      "Transfers must preserve document history, linked approvals, and audit trail. Use this section to record the source document, target site and process, and any standard or type change so compliance and traceability remain intact across the transfer."
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <h4 className="text-xl font-semibold text-primary">
                {t("1.10. Transfer the Document (Manual)")}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t("Move document to a new site, process, standard, or type with originator approval.")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transfer-doc-search">{t("Documented Information Search")}</Label>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="transfer-doc-search"
                  value={transferSearchRef}
                  onChange={(e) => {
                    setTransferSearchRef(e.target.value);
                    if (formErrors.transferSearchRef) setFormErrors((p) => ({ ...p, transferSearchRef: false }));
                  }}
                  className={cn("pl-9", requiredInputClass(!!formErrors.transferSearchRef))}
                  placeholder={t("e.g. Doc/2025/S1/P2/F/D1/v1")}
                />
              </div>
              <DocFieldError show={!!formErrors.transferSearchRef} t={t} />
              <p className="text-xs text-muted-foreground">
                {t("Enter the reference of the document to transfer")}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{t("Site")}</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground">{t("Current Site")}</span>
                  <Input
                    readOnly
                    value={currentSiteDisplay}
                    className="bg-muted/30 text-muted-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground">{t("Transfer to Site")}</span>
                  <div className="flex flex-wrap gap-2">
                    {transferSiteCodes.map((s) => {
                      const on = transferTargetSite === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            setTransferTargetSite(s);
                            setTransferTargetProcess("P1");
                            setTransferTargetProcessId("");
                            setTransferProcessOptions([]);
                          }}
                          className={`min-w-10 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                            on
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-muted-foreground hover:bg-muted/30"
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("Process")}</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground">{t("Current Process")}</span>
                  <Input
                    readOnly
                    value={currentProcessDisplay}
                    className="bg-muted/30 text-muted-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground">{t("Transfer to Process")}</span>
                  <div className="flex flex-wrap gap-2">
                    {isLoadingTransferProcesses && transferProcessOptions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">{t("Loading...")}</p>
                    ) : (
                      transferProcessOptions.map((p) => {
                        const on = transferTargetProcess === p.code;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setTransferTargetProcess(p.code);
                              setTransferTargetProcessId(p.id);
                              if (formErrors.transferTargetProcess) setFormErrors((p) => ({ ...p, transferTargetProcess: false }));
                            }}
                            className={`min-w-10 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                              on
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-muted-foreground hover:bg-muted/30"
                            }`}
                          >
                            {p.code}
                          </button>
                        );
                      })
                    )}
                  </div>
                  <DocFieldError show={!!formErrors.transferTargetProcess} t={t} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("Standard")}</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground">{t("Current Standard")}</span>
                  <Input
                    readOnly
                    value={managementStandardLabel(managementStandard, t, standards)}
                    className="bg-muted/30 text-muted-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transfer-standard-change" className="text-xs text-muted-foreground">
                    {t("Change (If Required)")}
                  </Label>
                  <Input
                    id="transfer-standard-change"
                    value={transferStandardChange}
                    onChange={(e) => setTransferStandardChange(e.target.value)}
                    placeholder={t("e.g. ISO 14001")}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("Document Type")}</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground">{t("Current Type")}</span>
                  <Input
                    readOnly
                    value={classificationTypeLabel(documentClassification, t)}
                    className="bg-muted/30 text-muted-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground">{t("Change (If Required)")}</span>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { value: "P" as const, title: "P" },
                        { value: "F" as const, title: "F" },
                        { value: "EXT" as const, title: "EXT" },
                      ] as const
                    ).map((item) => {
                      const on = transferDocumentClass === item.value;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => {
                            setTransferDocumentClass(item.value);
                            setDocumentClassification(item.value);
                            if (item.value === "P" || item.value === "F") {
                              setDocType(item.value);
                            }
                            if (item.value !== "EXT") {
                              setExternalDocumentFileName("");
                            }
                          }}
                          className={`min-w-11 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                            on
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-muted-foreground hover:bg-muted/30"
                          }`}
                        >
                          {item.title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transfer-initiator-request">{t("Request by the Initiator")}</Label>
              <Textarea
                id="transfer-initiator-request"
                value={transferInitiatorRequest}
                onChange={(e) => setTransferInitiatorRequest(e.target.value)}
                placeholder={t("Describe the reason for transfer and accountability context...")}
                className="min-h-[120px]"
              />
            </div>

            <div className="space-y-2">
              <Label>{t("Originator Consent (if different)")}</Label>
              <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg", formErrors.originatorConsent && "ring-1 ring-destructive p-1")}>
                <button
                  type="button"
                  onClick={() => {
                    setOriginatorConsent("accepted");
                    if (formErrors.originatorConsent) setFormErrors((p) => ({ ...p, originatorConsent: false }));
                  }}
                  className={`rounded-lg border p-3 text-sm font-medium transition-colors ${
                    originatorConsent === "accepted"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/30"
                  }`}
                >
                  {t("✓ Accepted")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOriginatorConsent("declined");
                    if (formErrors.originatorConsent) setFormErrors((p) => ({ ...p, originatorConsent: false }));
                  }}
                  className={`rounded-lg border p-3 text-sm font-medium transition-colors ${
                    originatorConsent === "declined"
                      ? "border-destructive bg-destructive text-destructive-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/30"
                  }`}
                >
                  {t("✕ Declined")}
                </button>
              </div>
              <DocFieldError show={!!formErrors.originatorConsent} t={t} />
              <p className="text-xs text-muted-foreground">
                {t(
                  "Originator consent is mandatory before any transfer. If process owner initiates, no consent required."
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Fifth card under Step 1: Document Title */}
      <Card className="py-4">
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-xl font-semibold text-foreground">{t("Document Title")}</h4>
            <p className="text-sm text-muted-foreground">{t("Enter document title (max 30 characters)")}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-title">{t("Document Title *")}</Label>
            <Input
              id="doc-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value.slice(0, 30));
                if (formErrors.title) setFormErrors((p) => ({ ...p, title: false }));
              }}
              className={requiredInputClass(!!formErrors.title)}
              placeholder={t("e.g., Machine Maintenance SOP")}
            />
            <DocFieldError show={!!formErrors.title} t={t} />
            <p className="text-xs text-muted-foreground text-right">
              {title.length}/30 {t("characters")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sixth card under Step 1: Standard Selection */}
      <Card className="py-4">
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-xl font-semibold text-foreground">{t("Standard Selection")}</h4>
            <p className="text-sm text-muted-foreground">{t("Select applicable management system standard")}</p>
          </div>

          <div className="space-y-2">
            <Label>{t("Management System Standard *")}</Label>
            <Select
              value={managementStandard}
              onValueChange={(v) => {
                setManagementStandard(v);
                if (formErrors.managementStandard) setFormErrors((p) => ({ ...p, managementStandard: false }));
              }}
            >
              <SelectTrigger className={cn("w-full", requiredInputClass(!!formErrors.managementStandard))}>
                <SelectValue
                  placeholder={isLoadingStandards ? t("Loading standards...") : t("Select standard")}
                />
              </SelectTrigger>
              <SelectContent>
                {standards.map((standard) => (
                  <SelectItem key={standard.id} value={standard.id}>
                    {standard.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DocFieldError show={!!formErrors.managementStandard} t={t} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("Clause")}</Label>
              <Select
                value={clause}
                onValueChange={setClause}
                disabled={!managementStandard || isLoadingClauses}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      !managementStandard
                        ? t("Select standard first")
                        : isLoadingClauses
                          ? t("Loading clauses...")
                          : t("Clause")
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {clauseOptions.map((clauseOption) => (
                    <SelectItem key={clauseOption} value={clauseOption}>
                      {clauseOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("Sub-Clause")}</Label>
              <Select
                value={subClause}
                onValueChange={setSubClause}
                disabled={!clause || isLoadingClauses}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={!clause ? t("Select clause first") : t("Sub-Clause")} />
                </SelectTrigger>
                <SelectContent>
                  {subClauseOptions.map((subClauseOption) => (
                    <SelectItem key={subClauseOption} value={subClauseOption}>
                      {subClauseOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seventh card under Step 1: Document Restriction */}
      <Card className="py-4">
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-xl font-semibold text-foreground">{t("Document Restriction (Security)")}</h4>
            <p className="text-sm text-muted-foreground">
              {t(
                "Lock confidential documents with PIN protection. When locked, the Process Owner and Approver must enter this PIN to open Review and Approval; the document initiator does not need a PIN to work on the draft."
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="space-y-2 md:col-span-3">
              <Label>{t("Document Restriction")}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRestriction("unlocked");
                    setFilePin("");
                    setConfirmFilePin("");
                    setPinError("");
                  }}
                  className={`rounded-lg border p-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${restriction === "unlocked"
                      ? docSelectionActive
                      : "border-border bg-background text-muted-foreground"
                    }`}
                >
                  <Unlock size={14} /> {t("Unlocked")}
                </button>
                <button
                  type="button"
                  onClick={handleLockSelection}
                  className={`rounded-lg border p-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${restriction === "locked"
                      ? docSelectionActive
                      : "border-border bg-background text-muted-foreground"
                    }`}
                >
                  <Lock size={14} /> {t("Locked")}
                </button>
              </div>
              {formErrors.documentPin ? (
                <DocFieldError show message={t("Please set a PIN before submitting a locked document")} t={t} />
              ) : null}
              {restriction === "locked" && filePin ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted px-3 py-2">
                  <p className="text-xs text-muted-foreground">
                    {t("PIN configured for this file:")} {"*".repeat(filePin.length)}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={handleEditPin}
                  >
                    {t("Edit PIN")}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
      <Dialog open={isPinDialogOpen} onOpenChange={setIsPinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {restriction === "locked" && !!filePin ? t("Update File PIN") : t("Set File PIN")}
            </DialogTitle>
            <DialogDescription>
              {t("Set a PIN to lock this document. Users will need this PIN to access or edit it.")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="file-pin">{t("PIN")}</Label>
              <Input
                id="file-pin"
                type="password"
                inputMode="numeric"
                value={filePin}
                onChange={(e) => setFilePin(e.target.value.replace(/\D/g, ""))}
                placeholder={t("Enter 4-8 digit PIN")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file-pin-confirm">{t("Confirm PIN")}</Label>
              <Input
                id="file-pin-confirm"
                type="password"
                inputMode="numeric"
                value={confirmFilePin}
                onChange={(e) => setConfirmFilePin(e.target.value.replace(/\D/g, ""))}
                placeholder={t("Re-enter PIN")}
              />
            </div>
            {pinError ? <p className="text-xs text-destructive">{t(pinError)}</p> : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsPinDialogOpen(false);
                if (!filePin) setRestriction("unlocked");
              }}
            >
              {t("Cancel")}
            </Button>
            <Button type="button" variant="default" onClick={saveFilePin}>
              {restriction === "locked" && !!filePin ? t("Update PIN") : t("Save PIN")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Eighth card under Step 1: Reasons for Document Change (hidden when Revise → Update — covered in 1.9) */}
      {!isReviseUpdate ? (
        <Card className="py-4">
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-xl font-semibold text-foreground">{t("Reasons for Document Change")}</h4>
              <p className="text-sm text-muted-foreground">
                {t("Select all applicable reasons (multiple selection)")}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              {reasonOptions.map((reason) => {
                const reasonId = `doc-change-reason-${reason.replace(/[^a-zA-Z0-9]+/g, "-")}`;
                return (
                  <div key={reason} className="flex items-center gap-2">
                    <Checkbox
                      id={reasonId}
                      checked={reasons.includes(reason)}
                      onCheckedChange={() => toggleReason(reason)}
                    />
                    <Label htmlFor={reasonId} className="cursor-pointer text-sm font-normal text-foreground">
                      {t(reason)}
                    </Label>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-border" />

            <div className="space-y-2">
              <Label htmlFor="reasons-comment">{t("Reasons / Comments (Max 50 words)")}</Label>
              <Textarea
                id="reasons-comment"
                value={reasonComment}
                onChange={(e) => setReasonComment(e.target.value)}
                placeholder={t("Describe the reasons for this change...")}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Ninth card under Step 1: Impact Assessment */}
      <Card className="py-4">
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-xl font-semibold text-foreground">{t("Impact Assessment")}</h4>
            <p className="text-sm text-muted-foreground">{t("Identify impact on other documents")}</p>
          </div>

          <div className="space-y-2">
            <Label>{t("Does this change affect other documents?")}</Label>
            <RadioGroup
              value={affectsOtherDocs}
              onValueChange={(v) => setAffectsOtherDocs(v as "yes" | "no")}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="yes" id="affects-other-yes" />
                <Label htmlFor="affects-other-yes" className="text-sm font-normal cursor-pointer">
                  {t("Yes")}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="no" id="affects-other-no" />
                <Label htmlFor="affects-other-no" className="text-sm font-normal cursor-pointer">
                  {t("No")}
                </Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Tenth card under Step 1: Risk Severity */}
      <Card className="py-4">
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-xl font-semibold text-foreground">{t("Risk Severity")}</h4>
            <p className="text-sm text-muted-foreground">{t("Assess risk level of this change")}</p>
          </div>

          <div className="space-y-2">
            <Label>{t("Risk Severity Level")}</Label>
            <RadioGroup
              value={riskLevel}
              onValueChange={(v) => setRiskLevel(v as "high" | "medium" | "low")}
              className="space-y-2"
            >
              <Label
                htmlFor="risk-level-high"
                className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer font-normal ${
                  riskLevel === "high" ? docSelectionActive : docSelectionIdle
                }`}
              >
                <RadioGroupItem value="high" id="risk-level-high" />
                <span className="text-sm">
                  <span className="font-semibold text-destructive">{t("High")}</span>{" "}
                  {t("Significant impact on operations or compliance")}
                </span>
              </Label>
              <Label
                htmlFor="risk-level-medium"
                className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer font-normal ${
                  riskLevel === "medium" ? docSelectionActive : docSelectionIdle
                }`}
              >
                <RadioGroupItem value="medium" id="risk-level-medium" />
                <span className="text-sm">
                  <span className="font-semibold text-amber-600 dark:text-amber-400">{t("Medium")}</span>{" "}
                  {t("Moderate impact with manageable risks")}
                </span>
              </Label>
              <Label
                htmlFor="risk-level-low"
                className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer font-normal ${
                  riskLevel === "low" ? docSelectionActive : docSelectionIdle
                }`}
              >
                <RadioGroupItem value="low" id="risk-level-low" />
                <span className="text-sm">
                  <span className="font-semibold text-primary">{t("Low")}</span>{" "}
                  {t("Minimal impact on operations")}
                </span>
              </Label>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="risk-comments">{t("Risk Comments")}</Label>
            <Textarea
              id="risk-comments"
              value={riskComments}
              onChange={(e) => setRiskComments(e.target.value)}
              placeholder={t("Describe risk factors and mitigation measures...")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Eleventh card under Step 1: Staff Training Requirement */}
      <Card className="py-4">
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-xl font-semibold text-foreground">{t("Staff Training Requirement")}</h4>
            <p className="text-sm text-muted-foreground">{t("Determine if training is needed for this change")}</p>
          </div>

          <div className="space-y-2">
            <Label>{t("Is staff training required?")}</Label>
            <RadioGroup
              value={trainingRequired}
              onValueChange={(v) => setTrainingRequired(v as "yes" | "no")}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="yes" id="training-required-yes" />
                <Label htmlFor="training-required-yes" className="text-sm font-normal cursor-pointer">
                  {t("Yes")}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="no" id="training-required-no" />
                <Label htmlFor="training-required-no" className="text-sm font-normal cursor-pointer">
                  {t("No")}
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="training-details">{t("Training Details")}</Label>
            <Textarea
              id="training-details"
              value={trainingDetails}
              onChange={(e) => setTrainingDetails(e.target.value)}
              placeholder={t("Provide training scope, participants, and schedule...")}
              disabled={trainingRequired === "no"}
            />
          </div>
        </CardContent>
      </Card>

      {/* Twelfth card: always shown — EXT uses upload; P/F use rich text editor */}
      <Card className="py-4">
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-xl font-semibold text-foreground">{t("Document Editor (Main Content)")}</h4>
            {documentClassification === "EXT" ? (
              <p className="text-sm text-muted-foreground">{t("Upload the external document file")}</p>
            ) : isReviseTransfer ? null : (
              <p className="text-sm text-muted-foreground">
                {isReviseUpdate
                  ? t("Enter or paste the revised document body")
                  : t("Enter or paste the document body")}
              </p>
            )}
          </div>
          {documentClassification === "EXT" ? (
            <div className={cn("relative min-h-[220px] rounded-lg border border-border bg-muted", formErrors.externalFile && "ring-1 ring-destructive")}>
              {externalDocumentFileName ? (
                <p className="break-all p-4 pr-48 text-sm text-foreground">{externalDocumentFileName}</p>
              ) : null}
              <input
                id="external-doc-upload"
                type="file"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setExternalDocumentFileName(f?.name ?? "");
                  if (f?.name && formErrors.externalFile) setFormErrors((p) => ({ ...p, externalFile: false }));
                }}
              />
              <label
                htmlFor="external-doc-upload"
                className="absolute bottom-4 right-4 inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-xs font-bold tracking-wide text-foreground shadow-sm transition-colors hover:bg-muted"
              >
                <Paperclip className="text-primary" size={16} aria-hidden />
                {t("UPLOAD FILE")}
              </label>
            </div>
          ) : null}
          {documentClassification === "EXT" ? (
            <DocFieldError show={!!formErrors.externalFile} message={t("Please upload an external document file")} t={t} />
          ) : null}
          {documentClassification !== "EXT" ? (
            <div id="document-editor-main" className="overflow-hidden rounded-lg border border-border bg-muted">
              <RichTextEditor
                value={documentEditorContent}
                onChange={setDocumentEditorContent}
                placeholder={documentEditorPlaceholder}
                minHeight={220}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Thirteenth card under Step 1: Document Dates */}
      {/* <Card className="py-4">
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-xl font-semibold text-foreground">{t("13. Document Dates")}</h4>
            <p className="text-sm text-muted-foreground">{t("Set planning and execution dates")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="plan-date">{t("Document Plan Date *")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="plan-date"
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !planDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    {planDate ? format(parseDateInput(planDate) as Date, "PPP") : t("Pick a date")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <DatePickerCalendar
                    mode="single"
                    selected={parseDateInput(planDate)}
                    onSelect={(date) => setPlanDate(toDateInput(date))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">{t("System generated")}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="actual-date">{t("Actual Date")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="actual-date"
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !actualDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    {actualDate ? format(parseDateInput(actualDate) as Date, "PPP") : t("Pick a date")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <DatePickerCalendar
                    mode="single"
                    selected={parseDateInput(actualDate)}
                    onSelect={(date) => setActualDate(toDateInput(date))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">{t("End Date")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="end-date"
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    {endDate ? format(parseDateInput(endDate) as Date, "PPP") : t("Pick a date")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <DatePickerCalendar
                    mode="single"
                    selected={parseDateInput(endDate)}
                    onSelect={(date) => setEndDate(toDateInput(date))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card> */}

      {/* Fourteenth card under Step 1: Output Preview */}
      <Card className="py-4">
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-xl font-semibold text-foreground">{t("Document Output Preview")}</h4>
            <p className="text-sm text-muted-foreground">{t("Preview how the final document will appear")}</p>
          </div>

          <div className="rounded-lg border border-border p-3">
            <p className="mb-2 text-xs text-muted-foreground">{t("Review before submitting")}</p>
            <div className="grid grid-cols-1 gap-y-2 rounded-md bg-muted p-4 text-sm md:grid-cols-2">
              <p>
                <span className="text-muted-foreground">{t("Document Ref:")}</span>{" "}
                <span className="ml-2 font-medium">{previewDocRef}</span>
              </p>
              <p>
                <span className="text-muted-foreground">{t("Title:")}</span>{" "}
                <span className="ml-2 font-medium">{title || t("—")}</span>
              </p>
              <p>
                <span className="text-muted-foreground">{t("Type:")}</span>{" "}
                <span className="ml-2 font-medium">
                  {documentClassification} - {previewTypeSubtitle}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">{t("Standard:")}</span>{" "}
                <span className="ml-2 font-medium">
                  {managementStandardLabel(managementStandard, t, standards)}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">{t("Clause:")}</span>{" "}
                <span className="ml-2 font-medium">{clause || t("—")}</span>
              </p>
              <p>
                <span className="text-muted-foreground">{t("Priority:")}</span>{" "}
                <span className="ml-2 font-medium">
                  {priorityLevel === "high" ? t("High") : t("Low")}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">{t("Risk Level:")}</span>{" "}
                <span className="ml-2 font-medium">{previewRiskLabel}</span>
              </p>
              <p>
                <span className="text-muted-foreground">{t("Initial Status:")}</span>{" "}
                <span className="ml-2 font-medium">{t("Draft")}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fifteenth card under Step 1: Submit Actions */}
      <Card className="py-4">
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-xl font-semibold text-foreground">{t("Submit Actions")}</h4>
            <p className="text-sm text-muted-foreground">
              {t(
                "Save as draft or submit; you will return to the document tables. Drafts can be edited later from the table screen."
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              variant="outline"
              type="button"
              className={cn("gap-2", !canProceed && !isViewMode && "opacity-60")}
              onClick={handleSaveDraftClick}
              disabled={isViewMode || isSaving || isLoadingContext || !canSaveDraft}
            >
              <Save size={14} />
              {t("Save as Draft")}
            </Button>
            <Button
              type="button"
              variant={canProceed && reviseSubmitGuardsSatisfied ? "default" : "outline"}
              className={cn("gap-2", (!canProceed || !reviseSubmitGuardsSatisfied) && !isViewMode && "opacity-60")}
              onClick={handleSubmitProceedClick}
              disabled={isSaving || isViewMode || isLoadingContext}
            >
              <Send size={14} />
              {t("Submit & Proceed")}
            </Button>
          </div>
          {!canProceed ? (
            <p className="text-xs text-muted-foreground">
              {t("Complete all required fields (site, process, owner, approver, title, and standard) to proceed.")}
            </p>
          ) : null}
          {!canSaveDraft ? (
            <p className="text-xs text-muted-foreground">
              {t(
                "You already have a document draft. You can submit this document for review, but only one draft is allowed at a time."
              )}
            </p>
          ) : null}
        </CardContent>
      </Card>

    </>
  );
}


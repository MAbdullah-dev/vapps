"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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
  Calendar,
  CircleAlert,
  Lock,
  Paperclip,
  RefreshCw,
  Save,
  Search,
  Send,
  Unlock,
} from "lucide-react";
import { documentActorMatches } from "@/lib/utils";
import { RichTextEditor } from "@/components/editor/rich-text-editor";

function managementStandardLabel(value: string): string {
  switch (value) {
    case "iso-9001":
      return "ISO 9001";
    case "iso-14001":
      return "ISO 14001";
    case "iso-45001":
      return "ISO 45001";
    case "integrated":
      return "Integrated Management System";
    default:
      return "ISO 9001";
  }
}

function classificationTypeLabel(c: "P" | "F" | "EXT"): string {
  if (c === "P") return "P — Maintained Doc";
  if (c === "F") return "F — Retained Record";
  return "EXT — External Doc";
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

function extractProcessCode(raw: string): string {
  // Attempts to extract process segment codes like "P1", "P2", ... from process names.
  const match = raw.match(/\b(P\d+)\b/i);
  if (match?.[1]) return match[1].toUpperCase();
  return raw.trim() ? raw.trim().slice(0, 4).toUpperCase() : "P1";
}

/** First path segment like D1, D12 (not P/F). */
function parseDocNumberSegment(documentRef: string): string | null {
  const parts = documentRef.split("/").filter(Boolean);
  for (const seg of parts) {
    const m = /^D(\d+)$/i.exec(String(seg).trim());
    if (m) return `D${m[1]}`;
  }
  return null;
}

function maxDocNumberAcrossRef(ref: string): number {
  const parts = ref.split("/").filter(Boolean);
  let max = 0;
  for (const seg of parts) {
    const m = /^D(\d+)$/i.exec(String(seg).trim());
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max;
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
  otherIndustry: string;
  setOtherIndustry: (value: string) => void;
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
  canProceed: boolean;
  isViewMode?: boolean;
  initialWizard?: Partial<DocumentWizardSnapshot>;
  /** When editing, used to keep Doc# in sync with saved preview_doc_ref. */
  initialPreviewDocRef?: string;
  /** Present when editing an existing record — skips allocating a new D#. */
  recordId?: string;
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
  otherIndustry,
  setOtherIndustry,
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
  canProceed,
  isViewMode = false,
  initialWizard,
  initialPreviewDocRef,
  recordId,
  onSubmitProceed,
  onSaveDraft,
}: CreateDocumentStepProps) {
  const [pathDocNumber, setPathDocNumber] = useState("D1");
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
  };

  const handleApproverChange = (name: string) => {
    setApproverName(name);
    const m = approverOptions.find((x) => x.name === name);
    setApproverUserId(m?.id ?? "");
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
    if (typeof initialWizard.documentNumberSegment === "string") {
      const m = /^D(\d+)$/i.exec(initialWizard.documentNumberSegment.trim());
      if (m) setPathDocNumber(`D${m[1]}`);
    }
  }, [initialWizard]);

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
    setReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
    );
  };

  const isReviseUpdate = actionType === "revise" && reviseSubAction === "update";
  const isReviseTransfer = actionType === "revise" && reviseSubAction === "transfer";

  const documentEditorPlaceholder = isReviseTransfer
    ? "Document body for the transferred record…"
    : isReviseUpdate
      ? "Document body appears here after revision…"
      : "Enter or paste document content…";

  const currentSiteDisplay = siteId.trim() || "S1";
  const currentProcessDisplay = processName.trim() || processId.trim() || "P1";
  const currentProcessCode = extractProcessCode(currentProcessDisplay);
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
    const parsed = parseDocNumberSegment(ref);
    if (parsed) setPathDocNumber(parsed);
  }, [initialPreviewDocRef]);

  useEffect(() => {
    if (!orgId || recordId) return;
    let ignore = false;
    async function allocateNext() {
      try {
        const [activeRes, obsoleteRes] = await Promise.all([
          fetch(`/api/organization/${orgId}/documents?lifecycle=active`, { credentials: "include" }),
          fetch(`/api/organization/${orgId}/documents?lifecycle=obsolete`, { credentials: "include" }),
        ]);
        const activeJson = activeRes.ok ? await activeRes.json() : { records: [] };
        const obsoleteJson = obsoleteRes.ok ? await obsoleteRes.json() : { records: [] };
        const rows = [
          ...(Array.isArray(activeJson?.records) ? activeJson.records : []),
          ...(Array.isArray(obsoleteJson?.records) ? obsoleteJson.records : []),
        ] as Array<{ preview_doc_ref?: string }>;
        let max = 0;
        for (const row of rows) {
          max = Math.max(max, maxDocNumberAcrossRef(String(row.preview_doc_ref ?? "")));
        }
        if (!ignore) setPathDocNumber(`D${max + 1}`);
      } catch {
        if (!ignore) setPathDocNumber("D1");
      }
    }
    void allocateNext();
    return () => {
      ignore = true;
    };
  }, [orgId, recordId]);

  const previewDocRef = useMemo(() => {
    if (isReviseUpdate && searchCurrentDocumentRef.trim()) {
      return `${searchCurrentDocumentRef.trim()} → v2`;
    }
    if (isReviseTransfer) {
      const y = new Date().getFullYear();
      const cls = transferDocumentClass;
      const docSeg = cls === "EXT" ? "EXT" : pathDocNumber;
      return `Doc/${y}/${transferTargetSite}/${transferTargetProcess}/${cls}/${docSeg}/v1`;
    }
    return `Doc/${new Date().getFullYear()}/${siteId || "S1"}/${processId || "P1"}/${documentClassification}/${pathDocNumber}/v1`;
  }, [
    isReviseUpdate,
    isReviseTransfer,
    searchCurrentDocumentRef,
    pathDocNumber,
    transferDocumentClass,
    transferTargetSite,
    transferTargetProcess,
    siteId,
    processId,
    documentClassification,
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

  const handleSaveDraftClick = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onSaveDraft(buildSavePayload());
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitProceedClick = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onSubmitProceed(buildSavePayload());
    } finally {
      setIsSaving(false);
    }
  };

  const flowTitle =
    actionType === "create" ? "Create" : actionType === "revise" ? "Revise" : "Obsolete";

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
  };

  return (
    <>
      <Card className="py-4">
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-3xl font-semibold text-[#0A0A0A]">{flowTitle}</h3>
            <p className="text-sm text-[#6A7282]">Start Procedure(P) or Form(F)!</p>
          </div>

          <div className="space-y-1 pt-2">
            <h4 className="text-xl font-semibold text-[#0A0A0A]">1. Identity Information</h4>
            <p className="text-sm text-[#6A7282]">Auto-generated and basic organizational data</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <h5 className="text-lg font-semibold text-[#0A0A0A]">User Information</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="login-user-name">Name (Login User)</Label>
                  <Input
                    id="login-user-name"
                    value={loginUserName}
                    readOnly
                    className="bg-[#F9FAFB] text-[#6A7282]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organization-name">Organization Name</Label>
                  <Input
                    id="organization-name"
                    value={organizationName}
                    readOnly
                    className="bg-[#F9FAFB] text-[#6A7282]"
                    placeholder="Organization name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organization-identification">Organization Identification</Label>
                  <Input
                    id="organization-identification"
                    value={organizationIdentification}
                    readOnly
                    className="bg-[#F9FAFB] text-[#6A7282]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry-type">Industry Type (NAICS Code)</Label>
                  <Input
                    id="industry-type"
                    value={industryType}
                    readOnly
                    className="bg-[#F9FAFB] text-[#6A7282]"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="other-industry">Other Industry (if applicable)</Label>
                  <Input
                    id="other-industry"
                    value={otherIndustry}
                    onChange={(e) => setOtherIndustry(e.target.value)}
                    placeholder="Specify if other..."
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-[#E5E7EB]" />

            <div className="space-y-3">
              <h5 className="text-lg font-semibold text-[#0A0A0A]">Site Information</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="doc-site">Site / Unit *</Label>
                  <Select value={site} onValueChange={setSite} disabled={isLoadingContext || isLoadingSites}>
                    <SelectTrigger id="doc-site" className="w-full">
                      <SelectValue placeholder={isLoadingSites ? "Loading sites..." : "Select site"} />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map((siteOption) => (
                        <SelectItem key={siteOption.id} value={siteOption.id}>
                          {siteOption.code ? `${siteOption.code} - ${siteOption.name}` : siteOption.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="site-id">Site ID</Label>
                  <Input
                    id="site-id"
                    value={siteId}
                    readOnly
                    className="bg-[#F9FAFB] text-[#6A7282]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location (factory / office)</Label>
                  <Input
                    id="location"
                    value={location}
                    readOnly
                    className="bg-[#F9FAFB] text-[#6A7282]"
                    placeholder="e.g., Main Factory"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-[#E5E7EB]" />

            <div className="space-y-3">
              <h5 className="text-lg font-semibold text-[#0A0A0A]">Process Area</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="doc-process">Process / Area *</Label>
                  <Select
                    value={processId}
                    onValueChange={setProcessName}
                    disabled={!site || isLoadingProcesses}
                  >
                    <SelectTrigger id="doc-process" className="w-full">
                      <SelectValue
                        placeholder={
                          !site
                            ? "Select site first"
                            : isLoadingProcesses
                              ? "Loading processes..."
                              : "Select process"
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="process-id">Process ID</Label>
                  <Input
                    id="process-id"
                    value={processId}
                    readOnly
                    className="bg-[#F9FAFB] text-[#6A7282]"
                    placeholder="Auto-filled"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="process-owner">Process Owner / Responsible Person *</Label>
                  <Select
                    value={processOwner || undefined}
                    onValueChange={handleProcessOwnerChange}
                    disabled={isViewMode || isLoadingProcessOwners}
                  >
                    <SelectTrigger id="process-owner" className="w-full">
                      <SelectValue
                        placeholder={
                          isLoadingProcessOwners ? "Loading users..." : "Select process owner"
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
                        <div className="px-2 py-1.5 text-sm text-[#6B7280]">
                          No eligible top or middle-tier users available
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-[#6A7282]">
                    Top/middle tier only. The person creating this document cannot be Process Owner.
                  </p>
                </div>
              </div>
              <div className="space-y-2 max-w-xl">
                <Label htmlFor="doc-approver">Approver *</Label>
                <Select
                  value={approverName || undefined}
                  onValueChange={handleApproverChange}
                  disabled={isViewMode || isLoadingProcessOwners}
                >
                  <SelectTrigger id="doc-approver" className="w-full">
                    <SelectValue
                      placeholder={
                        isLoadingProcessOwners ? "Loading users..." : "Select approver (top tier)"
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
                      <div className="px-2 py-1.5 text-sm text-[#6B7280]">
                        No eligible top-tier approvers available
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-[#6A7282]">
                  Top-tier only. The person creating this document cannot be approver. The Process Owner cannot be
                  approver.
                </p>
              </div>
            </div>

            <div className="border-t border-[#E5E7EB]" />

            {!isReviseUpdate && !isReviseTransfer ? (
              <>
                <div className="space-y-3">
                  <h5 className="text-lg font-semibold text-[#0A0A0A]">Previous Document Reference</h5>
                  <div className="space-y-2">
                    <Label htmlFor="previous-ref">Old Reference Number (if any)</Label>
                    <Input
                      id="previous-ref"
                      value={previousRefNumber}
                      onChange={(e) => setPreviousRefNumber(e.target.value)}
                      placeholder="e.g., Doc/2024/S1/P2/P/D1/v1"
                    />
                    <p className="text-xs text-[#6A7282]">
                      Enter previous document reference if this is a revision
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#E5E7EB]" />
              </>
            ) : null}


            <div className="space-y-3">
              <h5 className="text-lg font-semibold text-[#0A0A0A]">Document Details</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Document Type</Label>
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="P">Type P (Maintained Document)</SelectItem>
                      <SelectItem value="F">Type F (Retained Record)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="doc-description">Description</Label>
                  <Textarea
                    id="doc-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Write document scope..."
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Second card under Step 1: Change Request */}
      <Card className="py-4">
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-xl font-semibold text-[#0A0A0A]">2. Change Request</h4>
            <p className="text-sm text-[#6A7282]">Document priority level</p>
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
                  ? "border-[#22B323] bg-[#EAF6EC]"
                  : "border-[#E5E7EB]"
              }`}
            >
              <RadioGroupItem value="high" id="priority-high" className="mt-1" />
              <div>
                <p className="font-semibold text-[#0A0A0A]">High (Strategic Documents)</p>
                <p className="text-sm text-[#6A7282]">
                  Policy, Manual, Procedure, SOP, Governance documents
                </p>
              </div>
            </Label>

            <Label
              htmlFor="priority-low"
              className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer font-normal ${
                priorityLevel === "low"
                  ? "border-[#22B323] bg-[#EAF6EC]"
                  : "border-[#E5E7EB]"
              }`}
            >
              <RadioGroupItem value="low" id="priority-low" className="mt-1" />
              <div>
                <p className="font-semibold text-[#0A0A0A]">Low (Operational Records)</p>
                <p className="text-sm text-[#6A7282]">Forms, Checklists, Logs, Templates</p>
              </div>
            </Label>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Third card under Step 1: Document Type */}
      <Card className="py-4">
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-xl font-semibold text-[#0A0A0A]">3. Document Type</h4>
            <p className="text-sm text-[#6A7282]">Select document classification</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { value: "P" as const, title: "P", subtitle: "Maintained Doc" },
              { value: "F" as const, title: "F", subtitle: "Retained Record" },
              { value: "EXT" as const, title: "EXT", subtitle: "External Doc" },
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
                      ? "border-[#22B323] bg-[#EAF6EC]"
                      : "border-[#E5E7EB] bg-white hover:bg-[#F9FAFB]"
                    }`}
                >
                  <p
                    className={`font-semibold ${isActive ? "text-[#22B323]" : "text-[#6A7282]"
                      }`}
                  >
                    {item.title}
                  </p>
                  <p
                    className={`text-sm mt-1 ${isActive ? "text-[#22B323]" : "text-[#6A7282]"
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

      {/* Fourth card under Step 1: Action Selection */}
      <Card className="py-4">
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-xl font-semibold text-[#0A0A0A]">4. Action Selection</h4>
            <p className="text-sm text-[#6A7282]">Select one action only (mutually exclusive)</p>
          </div>

          <div className="space-y-2">
            <Label>Action Type*</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { value: "create" as const, label: "Create" },
                { value: "revise" as const, label: "Revise" },
                { value: "obsolete" as const, label: "Obsolete" },
              ].map((item) => {
                const isActive = actionType === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setActionType(item.value)}
                    className={`rounded-lg border p-3 text-center font-medium transition-colors ${isActive
                        ? "border-[#22B323] bg-[#EAF6EC] text-[#22B323]"
                        : "border-[#E5E7EB] bg-white text-[#6A7282] hover:bg-[#F9FAFB]"
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
              <Label>Revise Sub-Action</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { value: "update" as const, label: "Revise -> Update" },
                  { value: "transfer" as const, label: "Revise -> Transfer" },
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
                          ? "border-[#22B323] bg-[#EAF6EC] text-[#22B323]"
                          : "border-[#E5E7EB] bg-white text-[#6A7282] hover:bg-[#F9FAFB]"
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

      {/* Revise → Update only: Revision Details (matches design 1.9) */}
      {isReviseUpdate ? (
        <Card className="py-4">
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-xl font-semibold text-[#0A0A0A]">1.9 Revision Details</h4>
              <p className="text-sm text-[#6A7282]">
                Revision/Update — version increments (v1 → v2), previous version archived
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="search-current-doc">Search Current Document (Required)</Label>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6A7282]"
                />
                <Input
                  id="search-current-doc"
                  value={searchCurrentDocumentRef}
                  onChange={(e) => setSearchCurrentDocumentRef(e.target.value)}
                  className="pl-9"
                  placeholder="e.g. Doc/2025/S1/P1/P/D1/v1"
                />
              </div>
              <p className="text-xs text-[#6A7282]">
                Enter the existing document reference number to revise
              </p>
            </div>

            <div className="space-y-2">
              <Label>Reasons for Change (Required)</Label>
              <p className="text-xs text-[#6A7282]">
                Select all applicable reasons (multiple selections allowed)
              </p>
              <div className="flex flex-wrap gap-2">
                {reasonOptions.map((reason) => {
                  const isOn = reasons.includes(reason);
                  return (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => toggleReason(reason)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        isOn
                          ? "border-[#22B323] bg-[#EAF6EC] text-[#22B323]"
                          : "border-[#E5E7EB] bg-white text-[#6A7282] hover:bg-[#F9FAFB]"
                      }`}
                    >
                      {reason}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="revision-comment">Reasons / Comments</Label>
              <Textarea
                id="revision-comment"
                value={revisionComment}
                onChange={(e) =>
                  setRevisionComment(limitToWords(e.target.value, 50))
                }
                placeholder="Other (please specify integration, max 50 words)"
              />
              <div className="flex justify-between text-xs text-[#6A7282]">
                <span>Max 50 words — briefly explain the reason for this revision</span>
                <span>{countWords(revisionComment)}/50 words</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Revise → Transfer: 1.10 Transfer the Document (Manual) */}
      {isReviseTransfer ? (
        <Card className="py-4">
          <CardContent className="space-y-4">
            <div className="rounded-md border border-[#BFDBFE] bg-[#EFF6FF] p-4">
              <div className="flex gap-3">
                <RefreshCw className="shrink-0 text-[#2563EB] mt-0.5" size={20} />
                <div>
                  <p className="text-sm font-semibold text-[#1E40AF]">
                    1.10 Transfer the Document (Manual)
                  </p>
                  <p className="text-xs text-[#1D4ED8] mt-1 leading-relaxed">
                    Transfers must preserve document history, linked approvals, and audit trail. Use this
                    section to record the source document, target site and process, and any standard or
                    type change so compliance and traceability remain intact across the transfer.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <h4 className="text-xl font-semibold text-[#22B323]">1.10. Transfer the Document (Manual)</h4>
              <p className="text-sm text-[#6A7282]">
                Move document to a new site, process, standard, or type with originator approval.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transfer-doc-search">Documented Information Search</Label>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6A7282]"
                />
                <Input
                  id="transfer-doc-search"
                  value={transferSearchRef}
                  onChange={(e) => setTransferSearchRef(e.target.value)}
                  className="pl-9"
                  placeholder="e.g. Doc/2025/S1/P2/F/D1/v1"
                />
              </div>
              <p className="text-xs text-[#6A7282]">Enter the reference of the document to transfer</p>
            </div>

            <div className="space-y-2">
              <Label>Site</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-xs text-[#6A7282]">Current Site</span>
                  <Input
                    readOnly
                    value={currentSiteDisplay}
                    className="bg-[#F9FAFB] text-[#6A7282]"
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-xs text-[#6A7282]">Transfer to Site</span>
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
                          className={`rounded-lg border px-3 py-2 text-sm font-medium min-w-[2.5rem] transition-colors ${
                            on
                              ? "border-[#22B323] bg-[#22B323] text-white"
                              : "border-[#E5E7EB] bg-white text-[#6A7282] hover:bg-[#F9FAFB]"
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
              <Label>Process</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-xs text-[#6A7282]">Current Process</span>
                  <Input
                    readOnly
                    value={currentProcessDisplay}
                    className="bg-[#F9FAFB] text-[#6A7282]"
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-xs text-[#6A7282]">Transfer to Process</span>
                  <div className="flex flex-wrap gap-2">
                    {isLoadingTransferProcesses && transferProcessOptions.length === 0 ? (
                      <p className="text-xs text-[#6A7282]">Loading...</p>
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
                            }}
                            className={`rounded-lg border px-3 py-2 text-sm font-medium min-w-[2.5rem] transition-colors ${
                              on
                                ? "border-[#22B323] bg-[#22B323] text-white"
                                : "border-[#E5E7EB] bg-white text-[#6A7282] hover:bg-[#F9FAFB]"
                            }`}
                          >
                            {p.code}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Standard</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-xs text-[#6A7282]">Current Standard</span>
                  <Input
                    readOnly
                    value={managementStandardLabel(managementStandard)}
                    className="bg-[#F9FAFB] text-[#6A7282]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transfer-standard-change" className="text-xs text-[#6A7282]">
                    Change (If Required)
                  </Label>
                  <Input
                    id="transfer-standard-change"
                    value={transferStandardChange}
                    onChange={(e) => setTransferStandardChange(e.target.value)}
                    placeholder="e.g. ISO 14001"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Document Type</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-xs text-[#6A7282]">Current Type</span>
                  <Input
                    readOnly
                    value={classificationTypeLabel(documentClassification)}
                    className="bg-[#F9FAFB] text-[#6A7282]"
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-xs text-[#6A7282]">Change (If Required)</span>
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
                          className={`rounded-lg border px-4 py-2 text-sm font-semibold min-w-[2.75rem] transition-colors ${
                            on
                              ? "border-[#22B323] bg-[#22B323] text-white"
                              : "border-[#E5E7EB] bg-white text-[#6A7282] hover:bg-[#F9FAFB]"
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
              <Label htmlFor="transfer-initiator-request">Request by the Initiator</Label>
              <Textarea
                id="transfer-initiator-request"
                value={transferInitiatorRequest}
                onChange={(e) => setTransferInitiatorRequest(e.target.value)}
                placeholder="Describe the reason for transfer and accountability context..."
                className="min-h-[120px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Originator Consent (if different)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOriginatorConsent("accepted")}
                  className={`rounded-lg border p-3 text-sm font-medium transition-colors ${
                    originatorConsent === "accepted"
                      ? "border-[#22B323] bg-[#22B323] text-white"
                      : "border-[#E5E7EB] bg-white text-[#6A7282] hover:bg-[#F9FAFB]"
                  }`}
                >
                  ✓ Accepted
                </button>
                <button
                  type="button"
                  onClick={() => setOriginatorConsent("declined")}
                  className={`rounded-lg border p-3 text-sm font-medium transition-colors ${
                    originatorConsent === "declined"
                      ? "border-[#EF4444] bg-[#EF4444] text-white"
                      : "border-[#E5E7EB] bg-white text-[#6A7282] hover:bg-[#F9FAFB]"
                  }`}
                >
                  ✕ Declined
                </button>
              </div>
              <p className="text-xs text-[#6A7282]">
                Originator consent is mandatory before any transfer. If process owner initiates, no consent
                required.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Fifth card under Step 1: Document Title */}
      <Card className="py-4">
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-xl font-semibold text-[#0A0A0A]">5. Document Title</h4>
            <p className="text-sm text-[#6A7282]">Enter document title (max 30 characters)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-title">Document Title *</Label>
            <Input
              id="doc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 30))}
              placeholder="e.g., Machine Maintenance SOP"
            />
            <p className="text-xs text-[#6A7282] text-right">{title.length}/30 characters</p>
          </div>
        </CardContent>
      </Card>

      {/* Sixth card under Step 1: Standard Selection */}
      <Card className="py-4">
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-xl font-semibold text-[#0A0A0A]">6. Standard Selection</h4>
            <p className="text-sm text-[#6A7282]">Select applicable management system standard</p>
          </div>

          <div className="space-y-2">
            <Label>Management System Standard *</Label>
            <Select value={managementStandard} onValueChange={setManagementStandard}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={isLoadingStandards ? "Loading standards..." : "Select standard"} />
              </SelectTrigger>
              <SelectContent>
                {standards.map((standard) => (
                  <SelectItem key={standard.id} value={standard.id}>
                    {standard.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Clause</Label>
              <Select
                value={clause}
                onValueChange={setClause}
                disabled={!managementStandard || isLoadingClauses}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      !managementStandard
                        ? "Select standard first"
                        : isLoadingClauses
                          ? "Loading clauses..."
                          : "Clause"
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
              <Label>Sub-Clause</Label>
              <Select
                value={subClause}
                onValueChange={setSubClause}
                disabled={!clause || isLoadingClauses}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={!clause ? "Select clause first" : "Sub-Clause"} />
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
            <h4 className="text-xl font-semibold text-[#0A0A0A]">7. Document Restriction (Security)</h4>
            <p className="text-sm text-[#6A7282]">
              Lock confidential documents with PIN protection. When locked, the Process Owner and Approver must enter
              this PIN to open Review and Approval; the document initiator does not need a PIN to work on the draft.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="space-y-2 md:col-span-3">
              <Label>Document Restriction</Label>
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
                      ? "border-[#22B323] bg-[#EAF6EC] text-[#22B323]"
                      : "border-[#E5E7EB] bg-white text-[#6A7282]"
                    }`}
                >
                  <Unlock size={14} /> Unlocked
                </button>
                <button
                  type="button"
                  onClick={handleLockSelection}
                  className={`rounded-lg border p-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${restriction === "locked"
                      ? "border-[#22B323] bg-[#EAF6EC] text-[#22B323]"
                      : "border-[#E5E7EB] bg-white text-[#6A7282]"
                    }`}
                >
                  <Lock size={14} /> Locked
                </button>
              </div>
              {restriction === "locked" && filePin ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2">
                  <p className="text-xs text-[#6A7282]">
                    PIN configured for this file: {"*".repeat(filePin.length)}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={handleEditPin}
                  >
                    Edit PIN
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
            <DialogTitle>{restriction === "locked" && !!filePin ? "Update File PIN" : "Set File PIN"}</DialogTitle>
            <DialogDescription>
              Set a PIN to lock this document. Users will need this PIN to access or edit it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="file-pin">PIN</Label>
              <Input
                id="file-pin"
                type="password"
                inputMode="numeric"
                value={filePin}
                onChange={(e) => setFilePin(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter 4-8 digit PIN"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file-pin-confirm">Confirm PIN</Label>
              <Input
                id="file-pin-confirm"
                type="password"
                inputMode="numeric"
                value={confirmFilePin}
                onChange={(e) => setConfirmFilePin(e.target.value.replace(/\D/g, ""))}
                placeholder="Re-enter PIN"
              />
            </div>
            {pinError ? <p className="text-xs text-[#DC2626]">{pinError}</p> : null}
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
              Cancel
            </Button>
            <Button type="button" className="bg-[#22B323] hover:bg-[#1a9825]" onClick={saveFilePin}>
              {restriction === "locked" && !!filePin ? "Update PIN" : "Save PIN"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Eighth card under Step 1: Reasons for Document Change (hidden when Revise → Update — covered in 1.9) */}
      {!isReviseUpdate ? (
        <Card className="py-4">
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-xl font-semibold text-[#0A0A0A]">8. Reasons for Document Change</h4>
              <p className="text-sm text-[#6A7282]">
                Select all applicable reasons (multiple selection)
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
                    <Label htmlFor={reasonId} className="text-sm font-normal text-[#0A0A0A] cursor-pointer">
                      {reason}
                    </Label>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-[#E5E7EB]" />

            <div className="space-y-2">
              <Label htmlFor="reasons-comment">Reasons / Comments (Max 50 words)</Label>
              <Textarea
                id="reasons-comment"
                value={reasonComment}
                onChange={(e) => setReasonComment(e.target.value)}
                placeholder="Describe the reasons for this change..."
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Ninth card under Step 1: Impact Assessment */}
      <Card className="py-4">
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-xl font-semibold text-[#0A0A0A]">9. Impact Assessment</h4>
            <p className="text-sm text-[#6A7282]">Identify impact on other documents</p>
          </div>

          <div className="space-y-2">
            <Label>Does this change affect other documents?</Label>
            <RadioGroup
              value={affectsOtherDocs}
              onValueChange={(v) => setAffectsOtherDocs(v as "yes" | "no")}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="yes" id="affects-other-yes" />
                <Label htmlFor="affects-other-yes" className="text-sm font-normal cursor-pointer">
                  Yes
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="no" id="affects-other-no" />
                <Label htmlFor="affects-other-no" className="text-sm font-normal cursor-pointer">
                  No
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
            <h4 className="text-xl font-semibold text-[#0A0A0A]">10. Risk Severity</h4>
            <p className="text-sm text-[#6A7282]">Assess risk level of this change</p>
          </div>

          <div className="space-y-2">
            <Label>Risk Severity Level</Label>
            <RadioGroup
              value={riskLevel}
              onValueChange={(v) => setRiskLevel(v as "high" | "medium" | "low")}
              className="space-y-2"
            >
              <Label
                htmlFor="risk-level-high"
                className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer font-normal ${
                  riskLevel === "high" ? "border-[#22B323] bg-[#EAF6EC]" : "border-[#E5E7EB]"
                }`}
              >
                <RadioGroupItem value="high" id="risk-level-high" />
                <span className="text-sm">
                  <span className="font-semibold text-[#EF4444]">High</span> Significant impact on operations or compliance
                </span>
              </Label>
              <Label
                htmlFor="risk-level-medium"
                className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer font-normal ${
                  riskLevel === "medium" ? "border-[#22B323] bg-[#EAF6EC]" : "border-[#E5E7EB]"
                }`}
              >
                <RadioGroupItem value="medium" id="risk-level-medium" />
                <span className="text-sm">
                  <span className="font-semibold text-[#F59E0B]">Medium</span> Moderate impact with manageable risks
                </span>
              </Label>
              <Label
                htmlFor="risk-level-low"
                className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer font-normal ${
                  riskLevel === "low" ? "border-[#22B323] bg-[#EAF6EC]" : "border-[#E5E7EB]"
                }`}
              >
                <RadioGroupItem value="low" id="risk-level-low" />
                <span className="text-sm">
                  <span className="font-semibold text-[#22B323]">Low</span> Minimal impact on operations
                </span>
              </Label>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="risk-comments">Risk Comments</Label>
            <Textarea
              id="risk-comments"
              value={riskComments}
              onChange={(e) => setRiskComments(e.target.value)}
              placeholder="Describe risk factors and mitigation measures..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Eleventh card under Step 1: Staff Training Requirement */}
      <Card className="py-4">
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-xl font-semibold text-[#0A0A0A]">11. Staff Training Requirement</h4>
            <p className="text-sm text-[#6A7282]">Determine if training is needed for this change</p>
          </div>

          <div className="space-y-2">
            <Label>Is staff training required?</Label>
            <RadioGroup
              value={trainingRequired}
              onValueChange={(v) => setTrainingRequired(v as "yes" | "no")}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="yes" id="training-required-yes" />
                <Label htmlFor="training-required-yes" className="text-sm font-normal cursor-pointer">
                  Yes
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="no" id="training-required-no" />
                <Label htmlFor="training-required-no" className="text-sm font-normal cursor-pointer">
                  No
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="training-details">Training Details</Label>
            <Textarea
              id="training-details"
              value={trainingDetails}
              onChange={(e) => setTrainingDetails(e.target.value)}
              placeholder="Provide training scope, participants, and schedule..."
              disabled={trainingRequired === "no"}
            />
          </div>
        </CardContent>
      </Card>

      {/* Twelfth card: always shown — EXT uses upload; P/F use rich text editor */}
      <Card className="py-4">
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-xl font-semibold text-[#0A0A0A]">12. Document Editor (Main Content)</h4>
            {documentClassification === "EXT" ? (
              <p className="text-sm text-[#6A7282]">Upload the external document file</p>
            ) : isReviseTransfer ? null : (
              <p className="text-sm text-[#6A7282]">
                {isReviseUpdate
                  ? "Enter or paste the revised document body"
                  : "Enter or paste the document body"}
              </p>
            )}
          </div>
          {documentClassification === "EXT" ? (
            <div className="relative min-h-[220px] rounded-lg border border-[#E5E7EB] bg-[#F9FAFB]">
              {externalDocumentFileName ? (
                <p className="p-4 text-sm text-[#0A0A0A] pr-48 break-all">{externalDocumentFileName}</p>
              ) : null}
              <input
                id="external-doc-upload"
                type="file"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setExternalDocumentFileName(f?.name ?? "");
                }}
              />
              <label
                htmlFor="external-doc-upload"
                className="absolute bottom-4 right-4 inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 py-2.5 text-xs font-bold tracking-wide text-[#0A0A0A] shadow-sm transition-colors hover:bg-[#F9FAFB]"
              >
                <Paperclip className="text-[#22B323]" size={16} aria-hidden />
                UPLOAD FILE
              </label>
            </div>
          ) : (
            <div id="document-editor-main" className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-[#F9FAFB]">
              <RichTextEditor
                value={documentEditorContent}
                onChange={setDocumentEditorContent}
                placeholder={documentEditorPlaceholder}
                minHeight={220}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Thirteenth card under Step 1: Document Dates */}
      <Card className="py-4">
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-xl font-semibold text-[#0A0A0A]">13. Document Dates</h4>
            <p className="text-sm text-[#6A7282]">Set planning and execution dates</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="plan-date">Document Plan Date *</Label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6A7282]" />
                <Input
                  id="plan-date"
                  type="date"
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-[#6A7282]">System generated</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="actual-date">Actual Date</Label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6A7282]" />
                <Input
                  id="actual-date"
                  type="date"
                  value={actualDate}
                  onChange={(e) => setActualDate(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6A7282]" />
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fourteenth card under Step 1: Output Preview */}
      <Card className="py-4">
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-xl font-semibold text-[#0A0A0A]">14. Document Output Preview</h4>
            <p className="text-sm text-[#6A7282]">Preview how the final document will appear</p>
          </div>

          <div className="rounded-lg border border-[#E5E7EB] p-3">
            <p className="text-xs text-[#6A7282] mb-2">Review before submitting</p>
            <div className="rounded-md bg-[#F9FAFB] p-4 grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm">
              <p><span className="text-[#6A7282]">Document Ref:</span> <span className="font-medium ml-2">{previewDocRef}</span></p>
              <p><span className="text-[#6A7282]">Title:</span> <span className="font-medium ml-2">{title || "—"}</span></p>
              <p><span className="text-[#6A7282]">Type:</span> <span className="font-medium ml-2">{documentClassification} - {documentClassification === "P" ? "Maintained Doc" : documentClassification === "F" ? "Retained Record" : "External Doc"}</span></p>
              <p><span className="text-[#6A7282]">Standard:</span> <span className="font-medium ml-2">{managementStandard || "ISO 9001"}</span></p>
              <p><span className="text-[#6A7282]">Clause:</span> <span className="font-medium ml-2">{clause || "—"}</span></p>
              <p><span className="text-[#6A7282]">Priority:</span> <span className="font-medium ml-2">{priorityLevel === "high" ? "High" : "Low"}</span></p>
              <p><span className="text-[#6A7282]">Risk Level:</span> <span className="font-medium ml-2">{riskLevel[0].toUpperCase() + riskLevel.slice(1)}</span></p>
              <p><span className="text-[#6A7282]">Initial Status:</span> <span className="font-medium ml-2">Draft</span></p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fifteenth card under Step 1: Submit Actions */}
      <Card className="py-4">
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-xl font-semibold text-[#0A0A0A]">15. Submit Actions</h4>
            <p className="text-sm text-[#6A7282]">
              Save as draft or submit; you will return to the document tables. Drafts can be edited later from
              the table screen.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              variant="outline"
              type="button"
              className="gap-2"
              onClick={handleSaveDraftClick}
              disabled={isViewMode || isSaving || isLoadingContext}
            >
              <Save size={14} />
              Save as Draft
            </Button>
            <Button
              type="button"
              className="bg-[#22B323] hover:bg-[#1a9825] gap-2 disabled:bg-[#A7D9A8] disabled:cursor-not-allowed"
              onClick={handleSubmitProceedClick}
              disabled={
                isSaving ||
                isViewMode ||
                !canProceed ||
                isLoadingContext ||
                !reviseSubmitGuardsSatisfied
              }
            >
              <Send size={14} />
              Submit &amp; Proceed
            </Button>
          </div>
          {!canProceed ? (
            <p className="text-xs text-[#6A7282]">
              Select a site and process to proceed to review.
            </p>
          ) : null}

          <div className="rounded-md border border-[#BFDBFE] bg-[#EFF6FF] p-3">
            <div className="flex items-start gap-2">
              <CircleAlert className="text-[#2563EB] mt-0.5" size={16} />
              <div>
                <p className="text-sm font-semibold text-[#1E40AF]">After Submission</p>
                <p className="text-xs text-[#1D4ED8]">
                  After submit, your entry is saved and you return to the document tables. Review and approval
                  workflows can be connected here when the backend is ready.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </>
  );
}


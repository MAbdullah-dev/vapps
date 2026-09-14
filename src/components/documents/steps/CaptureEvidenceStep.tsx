"use client";

import { AlertTriangle, ArrowUpRight, ChevronRight, FileText, Info, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { useTranslate } from "@/components/providers/translation-provider";
import { compactSiteCode, compactSiteCodeInDocumentRef } from "@/lib/documentRef";
import {
  buildManagementStandardNameMap,
  resolveManagementStandardLabel,
} from "@/lib/management-standard-label";
import { toast } from "sonner";
import {
  docBadgeActive,
  docInfoCard,
  docInfoCardIcon,
  docSectionNumber,
  docWarningBanner,
} from "@/lib/document-ui-classes";

type FormTemplateOption = {
  recordId: string;
  formTitle: string;
  referenceNumber: string;
  site: string;
  process: string;
  standard: string;
  clause: string;
  subclause: string;
};

type DocumentsApiRecord = {
  id: string;
  preview_doc_ref: string;
  form_data: Record<string, unknown> | null;
  wizard_data: Record<string, unknown> | null;
};

function isFTypeDocument(row: DocumentsApiRecord): boolean {
  const formData = (row.form_data ?? {}) as Record<string, unknown>;
  const wizard = (row.wizard_data ?? {}) as Record<string, unknown>;
  const t = String(wizard.documentClassification ?? formData.docType ?? "")
    .trim()
    .toUpperCase();
  return t === "F";
}

function mapRecordToTemplate(
  row: DocumentsApiRecord,
  standardNameById: Record<string, string>
): FormTemplateOption {
  const formData = (row.form_data ?? {}) as Record<string, unknown>;
  const documentRef = compactSiteCodeInDocumentRef(String(row.preview_doc_ref ?? "").trim() || "-");
  return {
    recordId: row.id,
    formTitle: String(formData.title ?? "").trim() || "-",
    referenceNumber: documentRef,
    site: compactSiteCode(String(formData.siteId ?? formData.site ?? "").trim() || "-"),
    process: String(formData.processName ?? formData.processId ?? "").trim() || "-",
    standard: resolveManagementStandardLabel(String(formData.managementStandard ?? ""), standardNameById),
    clause: String(formData.clause ?? "").trim() || "-",
    subclause: String(formData.subClause ?? "").trim() || "-",
  };
}

export type CaptureEvidenceStepHandle = {
  saveDraft: () => Promise<void>;
};

type CaptureEvidenceStepProps = {
  orgId: string;
  /** Master Document List F-type row id (`document_module_records.id`). */
  templateRecordId: string;
  templateRef: string;
  templatesHref: string;
  evidenceRecordId: string | null;
  onEvidenceRecordIdChange: (id: string) => void;
  onTemplateChange?: (next: { recordId: string; referenceNumber: string }) => void;
  onSubmit: (payload: {
    evidenceRecordId: string;
    captureData: Record<string, unknown>;
  }) => void;
  /** View-only: after capture submit or when opened from templates as View capture. */
  readOnly?: boolean;
  /** Hydrate fields from tenant `capture_data` JSON. */
  serverCapture?: Record<string, unknown> | null;
  /** Hydrate from source template document editor content when capture is first opened. */
  serverTemplateDocumentEditorContent?: string;
  ref?: Ref<CaptureEvidenceStepHandle>;
};

export default function CaptureEvidenceStep({
  orgId,
  templateRecordId,
  templateRef,
  templatesHref,
  evidenceRecordId,
  onEvidenceRecordIdChange,
  onTemplateChange,
  onSubmit,
  readOnly = false,
  serverCapture = null,
  serverTemplateDocumentEditorContent,
  ref,
}: CaptureEvidenceStepProps) {
  const { t } = useTranslate();
  const [formTemplates, setFormTemplates] = useState<FormTemplateOption[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [formTitleQuery, setFormTitleQuery] = useState("");
  const [formPickerOpen, setFormPickerOpen] = useState(false);
  const [shift, setShift] = useState("");
  const [lotBatchSerial, setLotBatchSerial] = useState("");
  const [capturedData, setCapturedData] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  /** Logged-in Support user performing capture (shown in Support Leadership summary). */
  const [captureOperator, setCaptureOperator] = useState<{
    name: string;
    idLabel: string;
  } | null>(null);
  const [isLoadingCaptureOperator, setIsLoadingCaptureOperator] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const saveDraftFnRef = useRef<() => Promise<void>>(async () => {});

  const selectedTemplate = useMemo(
    () => formTemplates.find((row) => row.recordId === templateRecordId) ?? null,
    [formTemplates, templateRecordId]
  );
  const reference = selectedTemplate?.referenceNumber || templateRef;

  useEffect(() => {
    if (selectedTemplate?.formTitle && selectedTemplate.formTitle !== "-") {
      setFormTitleQuery(selectedTemplate.formTitle);
    }
  }, [selectedTemplate?.formTitle]);

  useEffect(() => {
    let ignore = false;
    async function loadTemplates() {
      if (!orgId) {
        setFormTemplates([]);
        return;
      }
      setIsLoadingTemplates(true);
      try {
        const [docsRes, checklistsRes] = await Promise.all([
          fetch(`/api/organization/${orgId}/documents?lifecycle=active`, { credentials: "include" }),
          fetch(`/api/organization/${orgId}/audit-checklists`, { credentials: "include" }),
        ]);
        const json = docsRes.ok ? await docsRes.json() : { records: [] };
        const checklistsJson = checklistsRes.ok ? await checklistsRes.json() : { checklists: [] };
        if (ignore) return;
        const standardNameById = buildManagementStandardNameMap(
          Array.isArray(checklistsJson?.checklists) ? checklistsJson.checklists : []
        );
        const records = Array.isArray(json?.records) ? (json.records as DocumentsApiRecord[]) : [];
        setFormTemplates(records.filter(isFTypeDocument).map((row) => mapRecordToTemplate(row, standardNameById)));
      } catch {
        if (!ignore) setFormTemplates([]);
      } finally {
        if (!ignore) setIsLoadingTemplates(false);
      }
    }
    void loadTemplates();
    return () => {
      ignore = true;
    };
  }, [orgId]);

  const filteredFormTemplates = useMemo(() => {
    const q = formTitleQuery.trim().toLowerCase();
    if (!q) return formTemplates;
    return formTemplates.filter(
      (row) =>
        row.formTitle.toLowerCase().includes(q) || row.referenceNumber.toLowerCase().includes(q)
    );
  }, [formTemplates, formTitleQuery]);

  useEffect(() => {
    let ignore = false;
    async function loadProfile() {
      setIsLoadingCaptureOperator(true);
      try {
        const res = await fetch("/api/user/profile", { credentials: "include" });
        const j = res.ok ? await res.json() : {};
        if (ignore) return;
        const name = String(j.name ?? j.email ?? "").trim() || t("—");
        const emp = j.employeeId != null ? String(j.employeeId).trim() : "";
        const uid = String(j.id ?? "").trim();
        const idLabel = emp || uid || t("—");
        setCaptureOperator({ name, idLabel });
      } catch {
        if (!ignore) setCaptureOperator(null);
      } finally {
        if (!ignore) setIsLoadingCaptureOperator(false);
      }
    }
    void loadProfile();
    return () => {
      ignore = true;
    };
  }, [t]);

  useEffect(() => {
    if (!serverCapture) return;
    setShift(String(serverCapture.shift ?? ""));
    setLotBatchSerial(String(serverCapture.lotBatchSerial ?? ""));
    setCapturedData(String(serverCapture.capturedData ?? ""));
    setAdditionalNotes(String(serverCapture.additionalNotes ?? ""));
  }, [serverCapture]);

  useEffect(() => {
    const sourceContent = String(serverTemplateDocumentEditorContent ?? "");
    if (!sourceContent.trim()) return;
    // Prefill only when capture text is still empty, so user edits are never overridden.
    setCapturedData((prev) => (prev.trim().length > 0 ? prev : sourceContent));
  }, [serverTemplateDocumentEditorContent]);

  const canSubmit =
    !readOnly &&
    Boolean(templateRecordId.trim()) &&
    Boolean(shift.trim()) &&
    Boolean(lotBatchSerial.trim()) &&
    Boolean(capturedData.trim());

  const buildCapturePayload = () => ({
    templateRef,
    formTitle:
      selectedTemplate && selectedTemplate.formTitle !== "-"
        ? selectedTemplate.formTitle.trim()
        : "",
    shift: shift.trim(),
    lotBatchSerial: lotBatchSerial.trim(),
    capturedData: capturedData.trim(),
    additionalNotes: additionalNotes.trim(),
  });

  const saveDraftToTenant = async () => {
    if (readOnly) return;
    if (!templateRecordId.trim()) {
      toast.error(t("Select a form title before saving a draft."));
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/organization/${orgId}/documentary-evidence-records`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "draft",
          evidenceRecordId: evidenceRecordId || undefined,
          templateRecordId: templateRecordId.trim(),
          templatePreviewRef: reference || templateRef,
          capturePayload: buildCapturePayload(),
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok) {
        toast.error(
          typeof j.error === "string" && j.error.trim() ? j.error : t("Could not save draft.")
        );
        return;
      }
      if (j.id) onEvidenceRecordIdChange(j.id);
      toast.success(t("Draft saved to tenant database."));
    } catch {
      toast.error(t("Network error while saving."));
    } finally {
      setIsSaving(false);
    }
  };

  saveDraftFnRef.current = saveDraftToTenant;
  useImperativeHandle(ref, () => ({
    saveDraft: () => saveDraftFnRef.current(),
  }));

  const submitCaptureToTenant = async () => {
    if (readOnly) return;
    if (!canSubmit) return;
    if (!templateRecordId.trim()) {
      toast.error(t("Select a form title before submitting capture."));
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/organization/${orgId}/documentary-evidence-records`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit-capture",
          evidenceRecordId: evidenceRecordId || undefined,
          templateRecordId: templateRecordId.trim(),
          templatePreviewRef: reference || templateRef,
          capturePayload: buildCapturePayload(),
        }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        id?: string;
        error?: string;
        captureData?: Record<string, unknown>;
      };
      if (!res.ok) {
        toast.error(
          typeof j.error === "string" && j.error.trim() ? j.error : t("Could not submit capture.")
        );
        return;
      }
      const eid = String(j.id ?? "").trim();
      if (!eid) {
        toast.error(t("Save did not return a record id."));
        return;
      }
      onEvidenceRecordIdChange(eid);
      toast.success(t("Capture submitted and saved."));
      onSubmit({
        evidenceRecordId: eid,
        captureData: (j.captureData && typeof j.captureData === "object" ? j.captureData : {}) as Record<
          string,
          unknown
        >,
      });
    } catch {
      toast.error(t("Network error while submitting."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Card className="border border-border">
        <CardContent className="py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h3 className="mb-3 text-3xl font-bold leading-none text-foreground">{t("Capture")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("Real-time operational data capture by support staff")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={docBadgeActive}>
                REC-000124
              </Badge>
              <Button size="sm" className="gap-1.5 rounded-full px-4">
                {t("Learn More")}
                <ArrowUpRight size={14} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={docInfoCard}>
        <CardContent className="py-4">
          <div className="relative flex items-start gap-3">
            <div className={docInfoCardIcon}>
              <Info size={16} className="text-primary" />
            </div>
            <div className="text-foreground">
              <p className="text-xl font-bold tracking-wide text-foreground">{t("ACKNOWLEDGEMENT:")}</p>
              <p className="mt-2 text-sm leading-relaxed">
                {t(
                  "Mid-level leadership will verify that the required compliance data has been updated in the designated sections of the form to ensure proper documentation. They will confirm the form's content and layout remain unchanged. Any unauthorized alterations will result in rejection or discarding of the documentation. If changes are necessary, they will instruct the data entry personnel to follow the document change request workflow (P/F/EXT). They will also verify the accuracy and evidentiary basis of the data."
                )}
              </p>
            </div>

            {/* Large shield watermark on the right (screenshot-like) */}
            <div className="pointer-events-none absolute right-2 top-0 hidden sm:flex h-16 w-16 items-center justify-center">
              <ShieldCheck size={72} className="text-primary/30 opacity-40" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardContent className="p-5 space-y-4">
          <h4 className="text-base font-semibold text-foreground">
            <span className={docSectionNumber}>1.1</span>{" "}
            {t("Action Compliance Forms Engine (Documentary Evidence)")}
          </h4>

          <div className="space-y-2">
            <Label htmlFor="form-title-draft">
              {t("Form Title (Draft)")} <span className="text-red-500">*</span>
            </Label>
            <Popover open={formPickerOpen} onOpenChange={setFormPickerOpen}>
              <PopoverAnchor asChild>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="form-title-draft"
                    value={formTitleQuery}
                    onChange={(e) => {
                      setFormTitleQuery(e.target.value);
                      setFormPickerOpen(true);
                    }}
                    onFocus={() => setFormPickerOpen(true)}
                    placeholder={
                      isLoadingTemplates ? t("Loading forms…") : t("Search form title")
                    }
                    disabled={readOnly && Boolean(evidenceRecordId)}
                    className="h-10 pl-9"
                    autoComplete="off"
                  />
                </div>
              </PopoverAnchor>
              <PopoverContent
                className="w-96 max-w-[calc(100vw-2rem)] p-1"
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                {filteredFormTemplates.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">
                    {isLoadingTemplates ? t("Loading forms…") : t("No matching forms")}
                  </p>
                ) : (
                  <ul className="max-h-56 overflow-auto">
                    {filteredFormTemplates.map((row) => (
                      <li key={row.recordId}>
                        <button
                          type="button"
                          className="flex w-full flex-col items-start rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                          onClick={() => {
                            setFormTitleQuery(row.formTitle === "-" ? "" : row.formTitle);
                            setFormPickerOpen(false);
                            onTemplateChange?.({
                              recordId: row.recordId,
                              referenceNumber: row.referenceNumber,
                            });
                          }}
                        >
                          <span className="font-medium text-foreground">
                            {row.formTitle === "-" ? t("Untitled form") : row.formTitle}
                          </span>
                          <span className="text-xs text-muted-foreground">{row.referenceNumber}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              {t("A unique ID will be generated for traceability. Retained documented information (low-level specific documents).")}
            </p>
          </div>

          <div className={docWarningBanner}>
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
            <div className="min-w-0 space-y-1 text-sm">
              <p>
                <span className="font-semibold">{t("Note:")}</span>{" "}
                {t(
                  "Complete the form (draft). A unique ID will be generated for traceability. Retained documented information (low-level specific documents). Reference section 1.12.2 retained records."
                )}
              </p>
              <p>
                {t("e.g. Reference")}{" "}
                <span className="font-medium">Doc/2025/S1/P4/F/D5/v1</span>{" "}
                <Link
                  href={templatesHref}
                  className="inline-flex items-center gap-0.5 font-medium text-amber-800 underline-offset-2 hover:underline dark:text-amber-300"
                >
                  {t("Learn More")}
                  <ArrowUpRight size={12} />
                </Link>
              </p>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">
            {t(
              "Dynamic data capture serves as a method for generating documentary evidence, and it often manifests in commonplace documents such as standardized forms and comprehensive checklists. This regular, day-to-day recording of data provides tangible proof of adherence to established regulations, as can be seen in the maintenance of detailed training records. Furthermore, it significantly reinforces the practical application and consistent execution of organizational policies and standard operating procedures (SOPs). Mid-level management plays a crucial role in the process by carefully verifying the accuracy and completeness of the captured data. Once verified, the data is systematically archived and securely stored for a predetermined duration, typically a period of three years or more, as dictated by legal or organizational requirements."
            )}
          </p>

          <div className="flex items-start gap-3 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-100">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 dark:text-violet-300" />
            <p className="leading-relaxed">
              {t(
                "Preserved and maintained documented information, specifically encompassing detailed, low-level documents that have been carefully retained for future reference and use — including, but not limited to, specific documents containing granular, highly detailed information."
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardContent className="p-5 space-y-4">
          <div>
            <h4 className="text-base font-semibold text-foreground">
              <span className={docSectionNumber}>2.</span> {t("Record Metadata")}
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("Auto-generated and basic organizational data")}
            </p>
          </div>

          <div className="border-t border-border pt-4">
            <h5 className="text-sm font-semibold text-foreground">{t("Record Information")}</h5>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label className="flex items-center gap-2 text-sm leading-none font-medium">
                  {t("Record ID")}
                </Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value="2020"
                  className="mt-1 h-10 border-border bg-muted text-muted-foreground"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2 text-sm leading-none font-medium">
                  {t("UIN")}
                </Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value="015505"
                  className="mt-1 h-10 border-border bg-muted text-muted-foreground"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2 text-sm leading-none font-medium">
                  {t("Reference")}
                </Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value={reference}
                  title={reference}
                  className="mt-1 h-10 border-border bg-muted text-muted-foreground"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label className="flex items-center gap-2 text-sm leading-none font-medium">
                  {t("Form Title")}
                </Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value={selectedTemplate && selectedTemplate.formTitle !== "-" ? selectedTemplate.formTitle : ""}
                  placeholder={t("—")}
                  className="mt-1 h-10 border-border bg-muted text-muted-foreground"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2 text-sm leading-none font-medium">
                  {t("Site")}
                </Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value={selectedTemplate && selectedTemplate.site !== "-" ? selectedTemplate.site : ""}
                  placeholder={t("—")}
                  className="mt-1 h-10 border-border bg-muted text-muted-foreground"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2 text-sm leading-none font-medium">
                  {t("Process")}
                </Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value={selectedTemplate && selectedTemplate.process !== "-" ? selectedTemplate.process : ""}
                  placeholder={t("—")}
                  className="mt-1 h-10 border-border bg-muted text-muted-foreground"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label className="flex items-center gap-2 text-sm leading-none font-medium">
                  {t("Standard")}
                </Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value={selectedTemplate && selectedTemplate.standard !== "-" ? selectedTemplate.standard : ""}
                  placeholder={t("—")}
                  className="mt-1 h-10 border-border bg-muted text-muted-foreground"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2 text-sm leading-none font-medium">
                  {t("Clause")}
                </Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value={selectedTemplate && selectedTemplate.clause !== "-" ? selectedTemplate.clause : ""}
                  placeholder={t("—")}
                  className="mt-1 h-10 border-border bg-muted text-muted-foreground"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2 text-sm leading-none font-medium">
                  {t("Sub-Clause")}
                </Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value={selectedTemplate && selectedTemplate.subclause !== "-" ? selectedTemplate.subclause : ""}
                  placeholder={t("—")}
                  className="mt-1 h-10 border-border bg-muted text-muted-foreground"
                />
              </div>
            </div>

            <div className="mt-4">
              <Label className="flex items-center gap-2 text-sm leading-none font-medium">
                {t("Status")}
              </Label>
              <Input
                readOnly
                tabIndex={-1}
                value={t("Draft")}
                className="mt-1 h-10 border-border bg-muted text-muted-foreground"
              />
            </div>

            <div className="mt-4">
              <Label className="flex items-center gap-2 text-sm leading-none font-medium">
                {t("System Auto-Stamp")}
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardContent className="p-5 space-y-4">
          <div>
            <h4 className="text-base font-semibold text-foreground">
              <span className={docSectionNumber}>3.</span> {t("Operational Metadata")}
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("Shift, batch/lot, and technician details")}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="flex items-center gap-2 text-sm leading-none font-medium">
                {t("Shift*")}
              </Label>
              <Input
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                readOnly={readOnly}
                placeholder=" "
                className="mt-1 h-10 border-border bg-muted text-muted-foreground placeholder:text-muted-foreground/70"
              />
            </div>

            <div>
              <Label className="flex items-center gap-2 text-sm leading-none font-medium">
                {t("Tracking*")}
              </Label>
              <Input
                value={lotBatchSerial}
                onChange={(e) => setLotBatchSerial(e.target.value)}
                readOnly={readOnly}
                placeholder={t("e.g. 00010")}
                className="mt-1 h-10 border-border bg-muted text-muted-foreground placeholder:text-muted-foreground/70"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardContent className="p-5 space-y-4">
          <div>
            <h4 className="text-base font-semibold text-foreground">
              <span className={docSectionNumber}>4.</span> {t("Captured Data")}
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">{t("Documentary Evidence")}</p>
          </div>

          <div className="overflow-hidden rounded-md border border-border bg-muted">
            <RichTextEditor
              value={capturedData}
              onChange={setCapturedData}
              readOnly={readOnly}
              minHeight={160}
              showToolbar={!readOnly}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardContent className="p-5 space-y-4">
          <div>
            <h4 className="text-base font-semibold text-foreground">
              <span className={docSectionNumber}>5.</span> {t("Additional Notes")}
            </h4>
          </div>
          <Textarea
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            readOnly={readOnly}
            placeholder={t(
              "e.g. Immediate 5S audit should be conducted, safety concern observed at station 3..."
            )}
            className="min-h-[72px] resize-none border-border bg-muted text-muted-foreground placeholder:text-muted-foreground/70"
          />
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardContent className="p-5 space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground">
              {t("Support Leadership (capture operator)")}
            </h4>
            <p className="mt-1 text-xs text-muted-foreground">
              {t(
                "Who is performing data entry — must be Support Leadership. Updates when your account session changes."
              )}
            </p>
          </div>

          <div className="space-y-3 rounded-md border border-border bg-muted px-4 py-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  {t("Name:")}{" "}
                  <span className="font-medium text-foreground">
                    {isLoadingCaptureOperator
                      ? t("Loading…")
                      : captureOperator?.name ?? t("—")}
                  </span>
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  {t("ID (employee or user):")}{" "}
                  <span className="break-all font-mono text-[11px] font-medium text-foreground sm:text-xs">
                    {isLoadingCaptureOperator
                      ? t("Loading…")
                      : captureOperator?.idLabel ?? t("—")}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className={docWarningBanner}>
        <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-amber-500/40 bg-background">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </span>
        <p className="leading-relaxed">
          {t(
            "Caution! Only authorized data entry personnel should fill forms. No edits to layout or content."
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
        {!readOnly ? (
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={isSaving || !templateRecordId.trim()}
              onClick={() => void saveDraftToTenant()}
            >
              {t("Save draft")}
            </Button>
            <Button
              type="button"
              disabled={!canSubmit || isSaving}
              className="gap-2"
              onClick={() => void submitCaptureToTenant()}
            >
              {t("Submit Capture")}
              <ChevronRight size={16} />
            </Button>
          </>
        ) : (
          <span className="text-xs font-medium text-muted-foreground">
            {t("This capture is read-only.")}
          </span>
        )}
      </div>
    </>
  );
}

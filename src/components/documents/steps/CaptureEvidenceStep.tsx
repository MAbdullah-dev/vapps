"use client";

import { AlertTriangle, ArrowLeft, ArrowUpRight, ChevronRight, Info, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { useTranslate } from "@/components/providers/translation-provider";
import { isTopOrOperationalLeadershipTier } from "@/lib/documentaryEvidenceAccess";
import { toast } from "sonner";

type VerifierMember = {
  id: string;
  name: string;
  leadershipTier?: string;
  status?: string;
};

type CaptureEvidenceStepProps = {
  orgId: string;
  /** Master Document List F-type row id (`document_module_records.id`). */
  templateRecordId: string;
  templateRef: string;
  templatesHref: string;
  evidenceRecordId: string | null;
  onEvidenceRecordIdChange: (id: string) => void;
  onSubmit: (payload: {
    evidenceRecordId: string;
    verifierUserId: string;
    verifierName: string;
    captureData: Record<string, unknown>;
  }) => void;
  /** View-only: after capture submit or when opened from templates as View capture. */
  readOnly?: boolean;
  /** Hydrate fields from tenant `capture_data` JSON (and verifier from row). */
  serverCapture?: Record<string, unknown> | null;
  /** Hydrate from source template document editor content when capture is first opened. */
  serverTemplateDocumentEditorContent?: string;
  serverDesignatedVerifierUserId?: string;
  serverDesignatedVerifierName?: string;
};

export default function CaptureEvidenceStep({
  orgId,
  templateRecordId,
  templateRef,
  templatesHref,
  evidenceRecordId,
  onEvidenceRecordIdChange,
  onSubmit,
  readOnly = false,
  serverCapture = null,
  serverTemplateDocumentEditorContent,
  serverDesignatedVerifierUserId,
  serverDesignatedVerifierName,
}: CaptureEvidenceStepProps) {
  const { t } = useTranslate();
  // Placeholder values to match the screenshot layout.
  const reference = templateRef;
  const [shift, setShift] = useState("");
  const [lotBatchSerial, setLotBatchSerial] = useState("");
  const [capturedData, setCapturedData] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [verifierUserId, setVerifierUserId] = useState("");
  const [verifierOptions, setVerifierOptions] = useState<VerifierMember[]>([]);
  const [isLoadingVerifiers, setIsLoadingVerifiers] = useState(false);
  /** Logged-in Support user performing capture (shown in Support Leadership summary). */
  const [captureOperator, setCaptureOperator] = useState<{
    name: string;
    idLabel: string;
  } | null>(null);
  const [isLoadingCaptureOperator, setIsLoadingCaptureOperator] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
    let ignore = false;
    async function load() {
      if (!orgId) {
        setVerifierOptions([]);
        return;
      }
      setIsLoadingVerifiers(true);
      try {
        const res = await fetch(`/api/organization/${orgId}/members`, { credentials: "include" });
        const json = res.ok ? await res.json() : {};
        if (ignore) return;
        const raw = Array.isArray(json?.teamMembers)
          ? (json.teamMembers as VerifierMember[])
          : Array.isArray(json?.members)
            ? (json.members as VerifierMember[])
            : [];
        const filtered = raw.filter((m) => {
          const isActive = (m.status ?? "Active") === "Active";
          return isTopOrOperationalLeadershipTier(m.leadershipTier) && isActive;
        });
        setVerifierOptions(filtered);
      } catch {
        if (!ignore) setVerifierOptions([]);
      } finally {
        if (!ignore) setIsLoadingVerifiers(false);
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, [orgId]);

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

  useEffect(() => {
    if (!serverDesignatedVerifierUserId?.trim()) return;
    setVerifierUserId(serverDesignatedVerifierUserId.trim());
  }, [serverDesignatedVerifierUserId]);

  const verifierById = useMemo(() => {
    const m = new Map(verifierOptions.map((x) => [x.id, x]));
    if (serverDesignatedVerifierUserId?.trim() && serverDesignatedVerifierName?.trim()) {
      const id = serverDesignatedVerifierUserId.trim();
      if (!m.has(id)) {
        m.set(id, { id, name: serverDesignatedVerifierName.trim() });
      }
    }
    return m;
  }, [verifierOptions, serverDesignatedVerifierUserId, serverDesignatedVerifierName]);

  const canSubmit =
    !readOnly &&
    Boolean(templateRecordId.trim()) &&
    Boolean(verifierUserId.trim()) &&
    Boolean(shift.trim()) &&
    Boolean(lotBatchSerial.trim()) &&
    Boolean(capturedData.trim());

  const buildCapturePayload = () => ({
    templateRef,
    shift: shift.trim(),
    lotBatchSerial: lotBatchSerial.trim(),
    capturedData: capturedData.trim(),
    additionalNotes: additionalNotes.trim(),
    designatedVerifierUserId: verifierUserId.trim(),
    designatedVerifierName: verifierById.get(verifierUserId)?.name?.trim() ?? "",
  });

  const saveDraftToTenant = async () => {
    if (readOnly) return;
    if (!templateRecordId.trim()) {
      toast.error(t("Missing template link. Open capture from the templates list."));
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
          templatePreviewRef: templateRef,
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

  const submitCaptureToTenant = async () => {
    if (readOnly) return;
    if (!canSubmit) return;
    if (!templateRecordId.trim()) {
      toast.error(t("Missing template link."));
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
          templatePreviewRef: templateRef,
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
        verifierUserId: verifierUserId.trim(),
        verifierName: verifierById.get(verifierUserId)?.name?.trim() || "",
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
      {!templateRecordId.trim() ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          role="alert"
        >
          {t("Missing template document. Use")}{" "}
          <span className="font-medium">{t("Start Capture")}</span>{" "}
          {t(
            "from the F-record templates table so this session is linked to the Master Document List."
          )}
        </div>
      ) : null}

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
              <Badge className="bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0] hover:bg-[#DCFCE7]">
                REC-000124
              </Badge>
              <Button size="sm" className="gap-1.5 bg-[#1E3A8A] hover:bg-[#1E40AF] text-white rounded-full px-4">
                {t("Learn More")}
                <ArrowUpRight size={14} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-[#DBEAFE] bg-[#EFF6FF]">
        <CardContent className="py-4">
          <div className="relative flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#BFDBFE] bg-background font-semibold text-[#2563EB]">
              <Info size={16} className="text-[#2563EB]" />
            </div>
            <div className="text-[#1E3A8A]">
              <p className="text-xl font-bold tracking-wide text-[#1E40AF]">{t("ACKNOWLEDGEMENT:")}</p>
              <p className="mt-2 text-sm leading-relaxed">
                {t(
                  "Mid-level leadership will verify that the required compliance data has been updated in the designated sections of the form to ensure proper documentation. They will confirm the form's content and layout remain unchanged. Any unauthorized alterations will result in rejection or discarding of the documentation. If changes are necessary, they will instruct the data entry personnel to follow the document change request workflow (P/F/EXT). They will also verify the accuracy and evidentiary basis of the data."
                )}
              </p>
            </div>

            {/* Large shield watermark on the right (screenshot-like) */}
            <div className="pointer-events-none absolute right-2 top-0 hidden sm:flex h-16 w-16 items-center justify-center">
              <ShieldCheck size={72} className="text-[#93C5FD] opacity-40" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardContent className="p-5 space-y-4">
          <div>
            <h4 className="text-base font-semibold text-foreground">
              <span className="text-[#22B323]">1.</span> {t("Designated verifier")}
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(
                "Choose who will verify this record (Top Leadership and Operational Leadership members)."
              )}
            </p>
          </div>
          <div className="max-w-xl space-y-2">
            <Label htmlFor="designated-verifier">
              {t("Verifier")} <span className="text-red-500">*</span>
            </Label>
            <Select
              value={verifierUserId}
              onValueChange={(id) => setVerifierUserId(id)}
              disabled={readOnly || !orgId || isLoadingVerifiers}
            >
              <SelectTrigger id="designated-verifier" className="w-full bg-background">
                <SelectValue
                  placeholder={
                    isLoadingVerifiers
                      ? t("Loading members…")
                      : verifierOptions.length === 0
                        ? t("No eligible verifiers")
                        : t("Select verifier")
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {verifierOptions.map((m) => (
                  <SelectItem
                    key={m.id}
                    value={m.id}
                    title={String(m.leadershipTier ?? "").trim() || undefined}
                  >
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardContent className="p-5 space-y-4">
          <div>
            <h4 className="text-base font-semibold text-foreground">
              <span className="text-[#22B323]">2.</span> {t("Record Metadata")}
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
                  value={t("Inspection Checklist")}
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
                  value={t("S1")}
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
                  value={t("P4")}
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
                  value={t("ISO 9001")}
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
                  value={t("8.6 Release")}
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
                  value={t("8.6.1 Product Release")}
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
              <span className="text-[#22B323]">3.</span> {t("Operational Metadata")}
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
                {t("Lot / Batch / Serial*")}
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
              <span className="text-[#22B323]">4.</span> {t("Captured Data")}
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
              <span className="text-[#22B323]">5.</span> {t("Additional Notes")}
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
            {verifierUserId ? (
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">
                  {t("Designated verifier (your selection in step 1):")}{" "}
                  <span className="font-medium text-foreground">
                    {verifierById.get(verifierUserId)?.name ?? verifierUserId}
                  </span>
                  <span className="ml-1 text-muted-foreground">
                    (
                    {String(verifierById.get(verifierUserId)?.leadershipTier ?? "").trim() || t("—")}
                    )
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-xs text-amber-800/90 border-t border-amber-200/80 pt-3">
                {t("Select a designated verifier in")}{" "}
                <span className="font-medium">{t("section 1")}</span>{" "}
                {t("— it will appear here.")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 flex gap-3 items-start text-sm">
        <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#FDE68A] bg-background">
          <AlertTriangle className="h-4 w-4 text-[#F59E0B]" />
        </span>
        <p className="text-[#92400E] leading-relaxed">
          {t(
            "Caution! Only authorized data entry personnel should fill forms. No edits to layout or content."
          )}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center pt-2">
        <Button variant="outline" asChild>
          <Link href={templatesHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("Back to Templates")}
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2 justify-end">
          {!readOnly ? (
            <>
              <Button
                type="button"
                variant="secondary"
                disabled={isSaving || !templateRecordId.trim()}
                onClick={() => void saveDraftToTenant()}
              >
                {t("Save draft (tenant)")}
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
      </div>
    </>
  );
}

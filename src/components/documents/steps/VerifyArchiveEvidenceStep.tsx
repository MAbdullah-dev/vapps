"use client";

import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { docAckBox, docBadgeActive, docSectionNumber } from "@/lib/document-ui-classes";
import { toast } from "sonner";
import {
  generateDocumentaryEvidencePdf,
  type EvidencePdfData,
} from "@/lib/generateDocumentaryEvidencePdf";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { useTranslate } from "@/components/providers/translation-provider";

export type DesignatedVerifier = {
  userId: string;
  name: string;
};

type VerifyArchiveEvidenceStepProps = {
  orgId: string;
  evidenceRecordId: string;
  templateRef: string;
  initialCapturedData: string;
  designatedVerifier: DesignatedVerifier;
  /** edit: verifier completes; view: read-only pending or completed record. */
  stepMode?: "edit" | "readonly-completed";
  initialVerificationComments?: string;
  initialArchiveLocation?: string;
  initialRetentionPeriod?: string;
  /** Optional org/template/capture metadata for the single-page PDF layout. */
  pdfContext?: Partial<EvidencePdfData>;
  onBack: () => void;
  onConfirmComplete: () => void;
};

function dash(value: string | undefined | null): string {
  const s = String(value ?? "").trim();
  return s && s !== "-" ? s : "—";
}

function countPassFailNa(html: string): string {
  const stripped = String(html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ");
  const tokens = stripped.split(/[\s,;|/]+/).map((t) => t.trim().toLowerCase()).filter(Boolean);
  let pass = 0;
  let fail = 0;
  let na = 0;
  for (const token of tokens) {
    if (token === "pass" || token === "ok") pass += 1;
    else if (token === "fail") fail += 1;
    else if (token === "n/a" || token === "na") na += 1;
  }
  if (pass + fail + na === 0) return "—";
  return `${pass} / ${fail} / ${na}`;
}

export default function VerifyArchiveEvidenceStep({
  orgId,
  evidenceRecordId,
  templateRef,
  initialCapturedData,
  designatedVerifier,
  stepMode = "edit",
  initialVerificationComments = "",
  initialArchiveLocation = "",
  initialRetentionPeriod = "",
  pdfContext,
  onBack,
  onConfirmComplete,
}: VerifyArchiveEvidenceStepProps) {
  const { t } = useTranslate();
  const reference = templateRef;
  const readOnly = stepMode === "readonly-completed";
  const [capturedData, setCapturedData] = useState(initialCapturedData);
  const [verificationComments, setVerificationComments] = useState(
    readOnly ? initialVerificationComments : ""
  );
  const [archiveLocation, setArchiveLocation] = useState(readOnly ? initialArchiveLocation : "");
  const [retentionPeriod, setRetentionPeriod] = useState(readOnly ? initialRetentionPeriod : "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setCapturedData(initialCapturedData);
  }, [initialCapturedData]);

  useEffect(() => {
    if (!readOnly) return;
    setVerificationComments(initialVerificationComments);
    setArchiveLocation(initialArchiveLocation);
    setRetentionPeriod(initialRetentionPeriod);
  }, [readOnly, initialVerificationComments, initialArchiveLocation, initialRetentionPeriod]);

  const resolvedArchiveLocation = useMemo(
    () => archiveLocation.trim() || "Cloud",
    [archiveLocation]
  );
  const resolvedRetentionPeriod = useMemo(
    () => retentionPeriod.trim() || "3 Years",
    [retentionPeriod]
  );
  const previewArchiveLocation = useMemo(
    () => (resolvedArchiveLocation === "Cloud" ? t("Cloud") : resolvedArchiveLocation),
    [resolvedArchiveLocation, t]
  );
  const previewRetention = useMemo(
    () => (resolvedRetentionPeriod === "3 Years" ? t("3 Years") : resolvedRetentionPeriod),
    [resolvedRetentionPeriod, t]
  );

  const recordIdDisplay = useMemo(
    () => (evidenceRecordId ? `REC-${evidenceRecordId.slice(0, 8).toUpperCase()}` : "REC-000000"),
    [evidenceRecordId]
  );

  const formTitleDisplay = useMemo(
    () => (pdfContext?.formTitle?.trim() ? pdfContext.formTitle.trim() : t("Inspection Checklist")),
    [pdfContext?.formTitle, t]
  );

  const canComplete = Boolean(verificationComments.trim()) && !readOnly;

  const now = useMemo(() => new Date(), []);
  const archiveDateLabel = useMemo(
    () => `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`,
    [now]
  );
  const retentionExpiryLabel = useMemo(() => {
    const yrs = parseInt(resolvedRetentionPeriod, 10);
    const base = now.getFullYear();
    return String(Number.isFinite(yrs) && yrs > 0 ? base + yrs : base + 3);
  }, [resolvedRetentionPeriod, now]);

  const passFailNa = useMemo(() => countPassFailNa(capturedData), [capturedData]);

  const buildPdfData = useCallback((): EvidencePdfData => {
    const stamp = (() => {
      const n = new Date();
      const p = (x: number) => String(x).padStart(2, "0");
      return {
        systemDateLabel: `${p(n.getDate())}-${p(n.getMonth() + 1)}-${n.getFullYear()}`,
        systemTimeLabel: `${p(n.getHours())}-${p(n.getMinutes())}-${p(n.getSeconds())}`,
        verifyDateLabel: `${p(n.getDate())}-${p(n.getMonth() + 1)}-${n.getFullYear()}`,
        verifyTimeLabel: `${p(n.getHours())}-${p(n.getMinutes())}-${p(n.getSeconds())}`,
      };
    })();
    return {
      ...stamp,
      ...pdfContext,
      recordId: recordIdDisplay,
      reference,
      formTitle: formTitleDisplay,
      capturedData: capturedData.trim() || t("—"),
      verifierName: designatedVerifier.name,
      verifierUserId: designatedVerifier.userId,
      verificationComments: verificationComments.trim(),
      archiveLocation: previewArchiveLocation,
      retentionPeriod: previewRetention,
      archiveDate: archiveDateLabel,
      retentionExpiry: retentionExpiryLabel,
    };
  }, [
    t,
    recordIdDisplay,
    reference,
    capturedData,
    designatedVerifier,
    verificationComments,
    previewArchiveLocation,
    previewRetention,
    archiveDateLabel,
    retentionExpiryLabel,
    formTitleDisplay,
    pdfContext,
  ]);

  const downloadPdf = useCallback(
    (pdfData: EvidencePdfData) => {
      const doc = generateDocumentaryEvidencePdf(pdfData);
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `documentary-evidence-${pdfData.recordId}.pdf`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 200);
    },
    []
  );

  const handlePreviewPdf = useCallback(() => {
    try {
      downloadPdf(buildPdfData());
    } catch {
      toast.error(t("Could not generate PDF."));
    }
  }, [buildPdfData, downloadPdf, t]);

  const saveVerifyArchiveToTenant = async () => {
    if (!canComplete || !orgId || !evidenceRecordId || readOnly) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/organization/${orgId}/documentary-evidence-records`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evidenceRecordId,
          verifyArchivePayload: {
            verificationComments: verificationComments.trim(),
            archiveLocation: resolvedArchiveLocation,
            retentionPeriod: resolvedRetentionPeriod,
            capturedDataReview: capturedData.trim(),
          },
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(
          typeof j.error === "string" && j.error.trim() ? j.error : t("Could not save completion.")
        );
        return;
      }
      try {
        downloadPdf(buildPdfData());
      } catch {
        toast.error(t("Verification saved, but the PDF could not be generated."));
      }
      toast.success(t("Verification saved."));
      onConfirmComplete();
    } catch {
      toast.error(t("Network error while saving."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Card className="border border-border">
        <CardContent className="py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h3 className="text-[28px] font-bold leading-tight text-foreground">{t("Verify")}</h3>
              <p className="max-w-2xl text-sm text-muted-foreground">
                {t("Mid-Level Management — Data accuracy & SOP compliance review")}
              </p>
            </div>
            <Badge className={cn(docBadgeActive, "shrink-0 rounded-full px-3")}>{recordIdDisplay}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardContent className="p-5 space-y-4">
          <div>
            <h4 className="text-base font-semibold text-foreground">
              <span className={docSectionNumber}>1.</span>
              {t("Captured Record Summary")}
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("Review the data captured in the previous stage")}
            </p>
          </div>

          <div className="border-t border-border pt-4">
            <h5 className="text-sm font-semibold text-foreground">{t("Record Information")}</h5>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <SummaryField label={t("Record ID")} value={recordIdDisplay} />
              <SummaryField label={t("Reference")} value={reference} />
              <SummaryField label={t("Form Title")} value={formTitleDisplay} />
              <SummaryField label={t("Site")} value={dash(pdfContext?.siteLabel)} />
              <SummaryField label={t("Process")} value={dash(pdfContext?.processLabel)} />
              <SummaryField label={t("Standard")} value={dash(pdfContext?.standardLabel)} />
              <SummaryField label={t("Captured By")} value={dash(pdfContext?.captureByName)} />
              <SummaryField label={t("Shift")} value={dash(pdfContext?.shiftLabel)} />
              <SummaryField label={t("Tracking#")} value={dash(pdfContext?.lotBatchSerial)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardContent className="p-5 space-y-3">
          <div>
            <h4 className="text-base font-semibold text-foreground">
              <span className={docSectionNumber}>2.</span>
              {t("Captured Data")}
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">{t("Documentary Evidence")}</p>
          </div>
          {capturedData.trim() ? (
            <div className="overflow-hidden rounded-md border border-border bg-muted" aria-readonly="true">
              <RichTextEditor
                value={capturedData}
                onChange={() => {}}
                readOnly
                minHeight={160}
                showToolbar={false}
              />
            </div>
          ) : (
            <div className="min-h-[140px] rounded-md border border-border bg-muted" aria-hidden />
          )}
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardContent className="p-5 space-y-4">
          <div>
            <h4 className="text-base font-semibold text-foreground">
              <span className={docSectionNumber}>3.</span>
              {t("Verification Details")}
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("Mid-Level Management confirms data accuracy and SOP compliance")}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-sm font-medium">
                {t("Verifier Name")}
                <span className="text-red-500"> *</span>
              </Label>
              <Input
                readOnly
                tabIndex={-1}
                value={designatedVerifier.name}
                className="mt-1 h-10 border-border bg-muted text-foreground"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">{t("Verifier ID")}</Label>
              <Input
                readOnly
                tabIndex={-1}
                value={designatedVerifier.userId}
                className="mt-1 h-10 border-border bg-muted text-muted-foreground"
              />
            </div>
          </div>

          <div>
              <Label className="text-sm font-medium">
                {t("Verification Comments")}
                <span className="text-red-500"> *</span>
              </Label>
            <Textarea
              value={verificationComments}
              onChange={(e) => setVerificationComments(e.target.value)}
              readOnly={readOnly}
              placeholder={t("e.g. Verified the checklist and found OK. All items reviewed against SOP-QA-001.")}
              className="mt-1 min-h-[96px] resize-none border-border bg-background text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className={cn(docAckBox, "p-4")}>
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <FileText className="h-4 w-4 shrink-0" />
              {t("PDF Documentary Evidence — Preview Contents")}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              <PdfRow label={t("Record ID")} value={recordIdDisplay} />
              <PdfRow label={t("Reference Number")} value={dash(reference)} />
              <PdfRow label={t("Form Title")} value={formTitleDisplay} />
              <PdfRow label={t("Archive Date")} value={archiveDateLabel} />
              <PdfRow label={t("Archive Location")} value={previewArchiveLocation} />
              <PdfRow label={t("Retention Period")} value={previewRetention} />
              <PdfRow label={t("Retention Expiry")} value={retentionExpiryLabel} />
              <PdfRow label={t("Captured By")} value={dash(pdfContext?.captureByName)} />
              <PdfRow label={t("Verified By")} value={dash(designatedVerifier.name)} />
              <PdfRow label={t("Verify Comments")} value={dash(verificationComments)} />
              <PdfRow label={t("Pass / Fail / N/A")} value={passFailNa} className="sm:col-span-2" />
            </div>
            <p className="mt-4 border-t border-primary/20 pt-3 text-sm text-primary">
              {t("Full inspection checklist data and timestamps will be included in the generated PDF.")}
            </p>
            <Button
              type="button"
              onClick={handlePreviewPdf}
              className="mt-4 gap-2"
            >
              <FileText className="h-4 w-4" />
              {t("Preview PDF")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center pt-2">
        <Button type="button" variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t("Back")}
        </Button>
        {!readOnly ? (
          <Button
            type="button"
            disabled={!canComplete || isSaving}
            onClick={() => void saveVerifyArchiveToTenant()}
            className="gap-2"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            {isSaving ? t("Saving…") : t("Confirm Verification & Generate PDF")}
          </Button>
        ) : null}
      </div>
    </>
  );
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label className="text-sm font-medium">{label}</Label>
      <Input
        readOnly
        tabIndex={-1}
        value={value}
        title={value}
        className="mt-1 h-10 border-border bg-muted text-muted-foreground"
      />
    </div>
  );
}

function PdfRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <span className="shrink-0 font-medium text-primary">{label}:</span>
      <span className="break-all text-foreground">{value}</span>
    </div>
  );
}

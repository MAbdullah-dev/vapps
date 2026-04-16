"use client";

import { Archive, ArrowLeft, Download, FileText, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  generateDocumentaryEvidencePdf,
  type EvidencePdfData,
} from "@/lib/generateDocumentaryEvidencePdf";
import { RichTextEditor } from "@/components/editor/rich-text-editor";

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
  /** edit: verifier completes; readonly-completed: view finished record (status Active). */
  stepMode?: "edit" | "readonly-completed";
  initialVerificationComments?: string;
  initialArchiveLocation?: string;
  initialRetentionPeriod?: string;
  /** Optional org/template/capture metadata for the single-page PDF layout. */
  pdfContext?: Partial<EvidencePdfData>;
  onBack: () => void;
  onConfirmComplete: () => void;
};

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

  const previewArchiveLocation = useMemo(
    () => (archiveLocation.trim() ? archiveLocation.trim() : "Cloud"),
    [archiveLocation]
  );
  const previewRetention = useMemo(
    () => (retentionPeriod.trim() ? retentionPeriod.trim() : "3 Years"),
    [retentionPeriod]
  );

  const canComplete = Boolean(verificationComments.trim()) && !readOnly;

  const now = useMemo(() => new Date(), []);
  const archiveDateLabel = useMemo(
    () =>
      `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`,
    [now]
  );
  const retentionExpiryLabel = useMemo(() => {
    const yrs = parseInt(retentionPeriod, 10);
    const base = now.getFullYear();
    return String(Number.isFinite(yrs) && yrs > 0 ? base + yrs : base + 3);
  }, [retentionPeriod, now]);

  const handlePreviewPdf = useCallback(() => {
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
    const pdfData: EvidencePdfData = {
      ...stamp,
      ...pdfContext,
      recordId: evidenceRecordId ? `REC-${evidenceRecordId.slice(0, 8).toUpperCase()}` : "REC-000000",
      reference,
      formTitle: (pdfContext?.formTitle && pdfContext.formTitle.trim()) || "Inspection Checklist",
      capturedData: capturedData.trim() || "—",
      verifierName: designatedVerifier.name,
      verifierUserId: designatedVerifier.userId,
      verificationComments: verificationComments.trim(),
      archiveLocation: previewArchiveLocation,
      retentionPeriod: previewRetention,
      archiveDate: archiveDateLabel,
      retentionExpiry: retentionExpiryLabel,
    };
    try {
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
    } catch {
      toast.error("Could not generate PDF.");
    }
  }, [
    evidenceRecordId,
    reference,
    capturedData,
    designatedVerifier,
    verificationComments,
    previewArchiveLocation,
    previewRetention,
    archiveDateLabel,
    retentionExpiryLabel,
    pdfContext,
  ]);

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
            archiveLocation: archiveLocation.trim(),
            retentionPeriod: retentionPeriod.trim(),
            capturedDataReview: capturedData.trim(),
          },
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(typeof j.error === "string" && j.error.trim() ? j.error : "Could not save completion.");
        return;
      }
      toast.success("Verify & archive saved to tenant database.");
      onConfirmComplete();
    } catch {
      toast.error("Network error while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Card className="border border-[#0000001A]">
        <CardContent className="py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h3 className="text-3xl leading-none font-bold text-[#111827] mb-3">
              {readOnly ? "Verified record (Active)" : "Verify & Archive"}
            </h3>
              <p className="text-sm text-[#6B7280] max-w-2xl">
                {readOnly
                  ? "This documentary evidence record is complete. Verification and archive details are shown below."
                  : "Review captured evidence, record verification, configure archive storage, and generate the PDF in one step."}
              </p>
            </div>
            <Badge className="bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0] hover:bg-[#DCFCE7] shrink-0">
              {readOnly ? "Active" : "Verify"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-[#0000001A]">
        <CardContent className="p-5 space-y-4">
          <div>
            <h4 className="text-base font-semibold text-[#111827]">
              <span className="text-[#22B323]">1.</span> Record summary
            </h4>
            <p className="text-sm text-[#6B7280] mt-1">Template reference and context captured in the previous step</p>
          </div>

          <div className="border-t border-[#E5E7EB] pt-4">
            <h5 className="text-sm font-semibold text-[#111827]">Record information</h5>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label className="text-sm font-medium">Record ID</Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value="REC-000124"
                  className="mt-1 h-10 bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280]"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Reference</Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value={reference}
                  title={reference}
                  className="mt-1 h-10 bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280]"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Form title</Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value="Inspection Checklist"
                  className="mt-1 h-10 bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280]"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-[#0000001A]">
        <CardContent className="p-5 space-y-4">
          <div>
            <h4 className="text-base font-semibold text-[#111827]">
              <span className="text-[#22B323]">2.</span> Captured data
            </h4>
            <p className="text-sm text-[#6B7280] mt-1">
              {readOnly
                ? "Documentary evidence from capture (locked on this record)."
                : "View only — reference while you verify. Support staff entered this during capture; it cannot be edited here."}
            </p>
          </div>
          <div
            className="overflow-hidden rounded-md border border-[#E5E7EB] bg-[#F9FAFB]"
            aria-readonly="true"
          >
            <RichTextEditor
              value={capturedData}
              onChange={() => {}}
              readOnly
              minHeight={160}
              showToolbar={false}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border border-[#0000001A]">
        <CardContent className="p-5 space-y-4">
          <div>
            <h4 className="text-base font-semibold text-[#111827]">
              <span className="text-[#22B323]">3.</span> Verification
            </h4>
            <p className="text-sm text-[#6B7280] mt-1">
              Designated verifier was selected during capture (Top or Operational leadership).
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-sm font-medium">Verifier name</Label>
              <Input
                readOnly
                tabIndex={-1}
                value={designatedVerifier.name}
                className="mt-1 h-10 bg-[#F9FAFB] border-[#E5E7EB] text-[#111827]"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Verifier user ID</Label>
              <Input
                readOnly
                tabIndex={-1}
                value={designatedVerifier.userId}
                className="mt-1 h-10 bg-[#F9FAFB] border-[#E5E7EB] text-[#9CA3AF]"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">
              Verification comments <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={verificationComments}
              onChange={(e) => setVerificationComments(e.target.value)}
              readOnly={readOnly}
              placeholder="e.g. Verified against SOP; data complete and correct."
              className="mt-1 min-h-[120px] resize-none bg-white border-[#E5E7EB] text-[#111827] placeholder:text-[#9CA3AF]"
            />
          </div>

          <div className="rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3">
            <p className="text-sm font-semibold text-[#15803D]">Acknowledgement</p>
            <ul className="mt-2 space-y-1.5 text-sm text-[#166534] list-disc pl-5">
              <li>Verify section completeness and SOP compliance</li>
              <li>Confirm no unauthorized alterations</li>
              <li>Archive below completes retention and PDF generation</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-[#0000001A]">
        <CardContent className="p-5 space-y-4">
          <div>
            <h4 className="text-base font-semibold text-[#111827]">
              <span className="text-[#22B323]">4.</span> Archive configuration
            </h4>
            <p className="text-sm text-[#6B7280] mt-1">Storage location and retention (minimum 3 years per policy)</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-sm font-medium">Archive location</Label>
              <Input
                value={archiveLocation}
                onChange={(e) => setArchiveLocation(e.target.value)}
                readOnly={readOnly}
                className="mt-1 h-10 bg-white border-[#E5E7EB] text-[#111827]"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Retention period</Label>
              <Input
                value={retentionPeriod}
                onChange={(e) => setRetentionPeriod(e.target.value)}
                readOnly={readOnly}
                className="mt-1 h-10 bg-white border-[#E5E7EB] text-[#111827]"
              />
            </div>
          </div>

          <div className="border-t border-[#E5E7EB] pt-4">
            <h5 className="text-sm font-semibold text-[#111827]">Auto-computed</h5>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-sm font-medium">Archive date (auto)</Label>
                <Input readOnly tabIndex={-1} value={archiveDateLabel} className="mt-1 h-10 bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280]" />
              </div>
              <div>
                <Label className="text-sm font-medium">Retention expiry (auto)</Label>
                <Input readOnly tabIndex={-1} value={retentionExpiryLabel} className="mt-1 h-10 bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280]" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-[#0000001A]">
        <CardContent className="p-5 space-y-4">
          <div>
            <h4 className="text-base font-semibold text-[#111827]">
              <span className="text-[#22B323]">5.</span> PDF evidence
            </h4>
            <p className="text-sm text-[#6B7280] mt-1">Preview what will be included in the generated documentary evidence PDF</p>
          </div>

          <div className="rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#166534]">
              <FileText className="h-4 w-4 shrink-0" />
              PDF documentary evidence — preview
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <PdfRow label="Record ID" value="REC-000124" />
              <PdfRow label="Reference" value={reference} />
              <PdfRow label="Archive location" value={previewArchiveLocation} />
              <PdfRow label="Retention" value={previewRetention} />
              <PdfRow label="Verified by" value={designatedVerifier.name} />
              <PdfRow label="Verifier ID" value={designatedVerifier.userId} />
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handlePreviewPdf}
            className="w-full sm:w-auto gap-2 border-[#22B323] text-[#15803D] hover:bg-[#F0FDF4] hover:text-[#166534]"
          >
            <Download className="h-4 w-4" />
            Preview PDF
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center pt-2">
        <Button type="button" variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to templates
        </Button>
        {!readOnly ? (
          <Button
            type="button"
            disabled={!canComplete || isSaving}
            onClick={() => void saveVerifyArchiveToTenant()}
            className="gap-2 bg-[#22B323] hover:bg-[#1a9825] text-white"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
            {isSaving ? "Saving…" : "Confirm verify & archive"}
          </Button>
        ) : null}
      </div>
    </>
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
    <div className={cn("flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4", className)}>
      <span className="font-medium text-[#15803D] shrink-0">{label}</span>
      <span className="text-[#111827] text-right break-all">{value}</span>
    </div>
  );
}

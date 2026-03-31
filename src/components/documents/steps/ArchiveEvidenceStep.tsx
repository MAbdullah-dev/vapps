"use client";

import { Archive, ArrowLeft, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ArchiveEvidenceStepProps = {
  templateRef: string;
  onBack?: () => void;
  onConfirmArchive?: () => void;
};

export default function ArchiveEvidenceStep({
  templateRef,
  onBack,
  onConfirmArchive,
}: ArchiveEvidenceStepProps) {
  const reference = templateRef;
  const [archiveLocation, setArchiveLocation] = useState("");
  const [retentionPeriod, setRetentionPeriod] = useState("");
  const comments =
    "e.g. Verified the checklist and found OK. All items reviewed against SOP-QA-001.";

  const previewArchiveLocation = useMemo(
    () => (archiveLocation.trim() ? archiveLocation.trim() : "Cloud"),
    [archiveLocation]
  );
  const previewRetention = useMemo(
    () => (retentionPeriod.trim() ? retentionPeriod.trim() : "3 Years"),
    [retentionPeriod]
  );

  return (
    <>
      <Card className="border border-[#0000001A]">
        <CardContent className="py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h3 className="text-3xl leading-none font-bold text-[#111827] mb-3">Archive</h3>
              <p className="text-sm text-[#6B7280]">
                System generates PDF evidence and stores record securely
              </p>
            </div>
            <Badge className="bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0] hover:bg-[#DCFCE7] shrink-0">
              REC-000124
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-[#0000001A]">
        <CardContent className="p-5 space-y-4">
          <div>
            <h4 className="text-base font-semibold text-[#111827]">
              <span className="text-[#22B323]">1.</span>Verified Record Summary
            </h4>
            <p className="text-sm text-[#6B7280] mt-1">Complete record of all captured and verified data</p>
          </div>

          <div className="border-t border-[#E5E7EB] pt-4">
            <h5 className="text-sm font-semibold text-[#111827]">Record Information</h5>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label className="flex items-center gap-2 text-sm leading-none font-medium">Record ID</Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value="REC-000124"
                  className="mt-1 h-10 bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280]"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2 text-sm leading-none font-medium">Reference</Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value={reference}
                  title={reference}
                  className="mt-1 h-10 bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280]"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2 text-sm leading-none font-medium">Form Title</Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value="Inspection Checklist"
                  className="mt-1 h-10 bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280]"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label className="flex items-center gap-2 text-sm leading-none font-medium">Captured By</Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value="sacas"
                  className="mt-1 h-10 bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280]"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2 text-sm leading-none font-medium">Capture Date</Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value="13-03-2026"
                  className="mt-1 h-10 bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280]"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2 text-sm leading-none font-medium">Lot / Batch</Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value="sdcvasc"
                  className="mt-1 h-10 bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280]"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label className="flex items-center gap-2 text-sm leading-none font-medium">Verified By</Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value="Mr. Rashid (Quality Manager)"
                  className="mt-1 h-10 bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280]"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2 text-sm leading-none font-medium">Verifier ID</Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value="MGR-001"
                  className="mt-1 h-10 bg-[#F9FAFB] border-[#E5E7EB] text-[#9CA3AF]"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2 text-sm leading-none font-medium">Verify Date</Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value="13-03-2026"
                  className="mt-1 h-10 bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280]"
                />
              </div>
            </div>

            <div className="mt-4">
              <Label className="flex items-center gap-2 text-sm leading-none font-medium">Comments</Label>
              <Textarea
                readOnly
                tabIndex={-1}
                value={comments}
                className="mt-1 min-h-[120px] resize-none bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-[#0000001A]">
        <CardContent className="p-5 space-y-4">
          <div>
            <h4 className="text-base font-semibold text-[#111827]">
              <span className="text-[#22B323]">2.</span>Archive Configuration
            </h4>
            <p className="text-sm text-[#6B7280] mt-1">
              Set storage location and retention period (minimum 3 years per policy)
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className="flex items-center gap-2 text-sm leading-none font-medium">Archive Location</Label>
              <Input
                value={archiveLocation}
                onChange={(e) => setArchiveLocation(e.target.value)}
                className="mt-1 h-10 bg-white border-[#E5E7EB] text-[#111827]"
              />
            </div>
            <div>
              <Label className="flex items-center gap-2 text-sm leading-none font-medium">Retention Period</Label>
              <Input
                value={retentionPeriod}
                onChange={(e) => setRetentionPeriod(e.target.value)}
                className="mt-1 h-10 bg-white border-[#E5E7EB] text-[#111827]"
              />
            </div>
          </div>

          <div className="border-t border-[#E5E7EB] pt-4">
            <h5 className="text-sm font-semibold text-[#111827]">Auto-Computed Fields</h5>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label className="flex items-center gap-2 text-sm leading-none font-medium">Archive Date (Auto)</Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value="03/2026"
                  className="mt-1 h-10 bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280]"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2 text-sm leading-none font-medium">Retention Expiry Date (Auto)</Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value="2029"
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
              <span className="text-[#22B323]">3.</span>PDF Evidence Generation
            </h4>
            <p className="text-sm text-[#6B7280] mt-1">
              System will auto-generate a PDF with all captured data, metadata, verification, and timestamps
            </p>
          </div>

          <div className="rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#166534]">
              <FileText className="h-4 w-4 shrink-0" />
              PDF Documentary Evidence — Preview Contents
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <PdfRow label="Record ID" value="REC-000124" />
              <PdfRow label="Reference Number" value={reference} />
              <PdfRow label="Form Title" value="Inspection Checklist" />
              <PdfRow label="Archive Date" value="03/2026" />
              <PdfRow label="Archive Location" value={previewArchiveLocation} />
              <PdfRow label="Retention Period" value={previewRetention} />
              <PdfRow label="Retention Expiry" value="2029" />
              <PdfRow label="Captured By" value="sacas" />
              <PdfRow label="Verified By" value="Mr. Rashid (Quality Manager)" />
              <PdfRow label="Verify Comments" value="—" />
              <PdfRow label="Pass / Fail / N/A" value="10 / 0 / 0" className="sm:col-span-2" />
            </div>

            <div className="mt-4 border-t border-[#BBF7D0] pt-3">
              <p className="text-xs italic text-[#15803D]">
                *Full inspection checklist data and timestamps will be included in the generated PDF.*
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto border-[#22B323] text-[#15803D] hover:bg-[#F0FDF4] hover:text-[#166534]"
          >
            <FileText className="mr-2 h-4 w-4" />
            Preview PDF
          </Button>
        </CardContent>
      </Card>
      
      <div className="flex justify-between items-center">
            <Button type="button" variant="outline" onClick={onBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              type="button"
              onClick={onConfirmArchive}
              className="gap-2 bg-[#22B323] hover:bg-[#1a9825] text-white"
            >
              <Archive className="h-4 w-4" />
              Confirm Archive &amp; Generate PDF
            </Button>
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

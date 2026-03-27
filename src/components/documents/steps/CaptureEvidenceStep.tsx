"use client";

import { AlertTriangle, ArrowLeft, ArrowUpRight, ChevronRight, Info, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type CaptureEvidenceStepProps = {
  templateRef: string;
  templatesHref: string;
  onSubmit: () => void;
};

export default function CaptureEvidenceStep({
  templateRef,
  templatesHref,
  onSubmit,
}: CaptureEvidenceStepProps) {
  // Placeholder values to match the screenshot layout.
  const reference = templateRef;
  const [shift, setShift] = useState("");
  const [lotBatchSerial, setLotBatchSerial] = useState("");
  const [capturedData, setCapturedData] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  const canSubmit = Boolean(shift.trim()) && Boolean(lotBatchSerial.trim()) && Boolean(capturedData.trim());

  return (
    <>
      <Card className="border border-[#0000001A]">
        <CardContent className="py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h3 className="text-3xl leading-none font-bold text-[#111827] mb-3">Capture</h3>
              <p className="text-sm text-[#6B7280]">Real-time operational data capture by support staff</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0] hover:bg-[#DCFCE7]">
                REC-000124
              </Badge>
              <Button size="sm" className="gap-1.5 bg-[#1E3A8A] hover:bg-[#1E40AF] text-white rounded-full px-4">
                Learn More
                <ArrowUpRight size={14} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-[#DBEAFE] bg-[#EFF6FF]">
        <CardContent className="py-4">
          <div className="relative flex items-start gap-3">
            <div className="h-8 w-8 shrink-0 rounded-lg border border-[#BFDBFE] bg-white flex items-center justify-center text-[#2563EB] font-semibold">
              <Info size={16} className="text-[#2563EB]" />
            </div>
            <div className="text-[#1E3A8A]">
              <p className="text-xl font-bold tracking-wide text-[#1E40AF]">ACKNOWLEDGEMENT:</p>
              <p className="mt-2 text-sm leading-relaxed">
                Mid-level leadership will verify that the required compliance data has been updated in the
                designated sections of the form to ensure proper documentation. They will confirm the
                form&apos;s content and layout remain unchanged. Any unauthorized alterations will result in
                rejection or discarding of the documentation. If changes are necessary, they will instruct
                the data entry personnel to follow the document change request workflow (P/F/EXT). They
                will also verify the accuracy and evidentiary basis of the data.
              </p>
            </div>

            {/* Large shield watermark on the right (screenshot-like) */}
            <div className="pointer-events-none absolute right-2 top-0 hidden sm:flex h-16 w-16 items-center justify-center">
              <ShieldCheck size={72} className="text-[#93C5FD] opacity-40" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-[#0000001A]">
        <CardContent className="p-5 space-y-4">
          <div>
            <h4 className="text-base font-semibold text-[#111827]"> <span className="text-[#22B323]">1.</span> Record Metadata</h4>
            <p className="text-sm text-[#6B7280] mt-1">Auto-generated and basic organizational data</p>
          </div>

          <div className="border-t border-[#E5E7EB] pt-4">
            <h5 className="text-sm font-semibold text-[#111827]">Record Information</h5>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label className="flex items-center gap-2 text-sm leading-none font-medium">
                  Record ID
                </Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value="2020"
                  className="mt-1 h-10 bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280]"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2 text-sm leading-none font-medium">
                  UIN
                </Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value="015505"
                  className="mt-1 h-10 bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280]"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2 text-sm leading-none font-medium">
                  Reference
                </Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value={reference}
                  title={reference}
                  className="mt-1 h-10 bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280]"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label className="flex items-center gap-2 text-sm leading-none font-medium">
                  Form Title
                </Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value="Inspection Checklist"
                  className="mt-1 h-10 bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280]"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2 text-sm leading-none font-medium">
                  Site
                </Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value="S1"
                  className="mt-1 h-10 bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280]"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2 text-sm leading-none font-medium">
                  Process
                </Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value="P4"
                  className="mt-1 h-10 bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280]"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label className="flex items-center gap-2 text-sm leading-none font-medium">
                  Standard
                </Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value="ISO 9001"
                  className="mt-1 h-10 bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280]"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2 text-sm leading-none font-medium">
                  Clause
                </Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value="8.6 Release"
                  className="mt-1 h-10 bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280]"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2 text-sm leading-none font-medium">
                  Sub-Clause
                </Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value="8.6.1 Product Release"
                  className="mt-1 h-10 bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280]"
                />
              </div>
            </div>

            <div className="mt-4">
              <Label className="flex items-center gap-2 text-sm leading-none font-medium">
                Status
              </Label>
              <Input
                readOnly
                tabIndex={-1}
                value="Draft"
                className="mt-1 h-10 bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280]"
              />
            </div>

            <div className="mt-4">
              <Label className="flex items-center gap-2 text-sm leading-none font-medium">
                System Auto-Stamp
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-[#0000001A]">
        <CardContent className="p-5 space-y-4">
          <div>
            <h4 className="text-base font-semibold text-[#111827]"> <span className="text-[#22B323]">2.</span> Operational Metadata</h4>
            <p className="text-sm text-[#6B7280] mt-1">Shift, batch/lot, and technician details</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="flex items-center gap-2 text-sm leading-none font-medium">
                Shift*
              </Label>
              <Input
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                placeholder=" "
                className="mt-1 h-10 bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280] placeholder:text-[#9CA3AF]"
              />
            </div>

            <div>
              <Label className="flex items-center gap-2 text-sm leading-none font-medium">
                Lot / Batch / Serial*
              </Label>
              <Input
                value={lotBatchSerial}
                onChange={(e) => setLotBatchSerial(e.target.value)}
                placeholder="e.g. 00010"
                className="mt-1 h-10 bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280] placeholder:text-[#9CA3AF]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-[#0000001A]">
        <CardContent className="p-5 space-y-4">
          <div>
            <h4 className="text-base font-semibold text-[#111827]"> <span className="text-[#22B323]">3.</span> Captured Data</h4>
            <p className="text-sm text-[#6B7280] mt-1">Documentary Evidence</p>
          </div>

          <Textarea
            value={capturedData}
            onChange={(e) => setCapturedData(e.target.value)}
            placeholder=""
            className="min-h-[160px] resize-none bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280] placeholder:text-[#9CA3AF]"
          />
        </CardContent>
      </Card>

      <Card className="border border-[#0000001A]">
        <CardContent className="p-5 space-y-4">
          <div>
            <h4 className="text-base font-semibold text-[#111827]"> <span className="text-[#22B323]">4.</span> Additional Notes</h4>
          </div>
          <Textarea
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="e.g. Immediate 5S audit should be conducted, safety concern observed at station 3..."
            className="min-h-[72px] resize-none bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280] placeholder:text-[#9CA3AF]"
          />
        </CardContent>
      </Card>

      <Card className="border border-[#0000001A]">
        <CardContent className="p-5 space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-[#6B7280]">Support Leadership</h4>
          </div>

          <div className="rounded-md bg-[#F9FAFB] border border-[#E5E7EB] px-4 py-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="min-w-0">
                <p className="text-xs text-[#9CA3AF]">Support leadership name: <span className="text-[#111827] font-medium">Mr. Abdullah</span></p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-[#9CA3AF]">Support leadership ID: <span className="text-[#111827] font-medium">4255</span></p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 flex gap-3 items-start text-sm">
        <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#FDE68A] bg-white">
          <AlertTriangle className="h-4 w-4 text-[#F59E0B]" />
        </span>
        <p className="text-[#92400E] leading-relaxed">
          Caution! Only authorized data entry personnel should fill forms. No edits to layout or content.
        </p>
      </div>

      <div className="flex justify-between items-center pt-2">
        <Button variant="outline" asChild>
          <Link href={templatesHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </Link>
        </Button>

        <Button type="button" disabled={!canSubmit} className="gap-2">
          Submit Capture
          <ChevronRight size={16} />
        </Button>
      </div>
    </>
  );
}

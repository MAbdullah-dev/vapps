"use client";

import { ArrowLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type VerifyEvidenceStepProps = {
  templateRef: string;
  onBack: () => void;
  onSubmit: () => void;
};

export default function VerifyEvidenceStep({ templateRef, onBack, onSubmit }: VerifyEvidenceStepProps) {
  const [capturedData, setCapturedData] = useState("");
  const [verifierName, setVerifierName] = useState("Mr. Rashid (Quality Manager)");
  const [verifierId] = useState("MGR-001");
  const [verificationComments, setVerificationComments] = useState("");

  const canSubmitVerification = Boolean(verificationComments.trim());

  return (
    <>
      <Card className="border border-[#0000001A]">
        <CardContent className="py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h3 className="text-3xl leading-none font-bold text-[#111827] mb-3">Verify</h3>
              <p className="text-sm text-[#6B7280]">Mid-Level Management — Data accuracy & SOP compliance review</p>
            </div>
            <Badge className="bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0] hover:bg-[#DCFCE7]">
              REC-000124
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-[#0000001A]">
        <CardContent className="p-5 space-y-4">
          <div>
            <h4 className="text-base font-semibold text-[#111827]">
              <span className="text-[#22B323]">1.</span>Captured Record Summary
            </h4>
            <p className="text-sm text-[#6B7280] mt-1">Review the data captured in the previous stage</p>
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
                  value={templateRef}
                  title={templateRef}
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
                <Label className="flex items-center gap-2 text-sm leading-none font-medium">Site</Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value="S1"
                  className="mt-1 h-10 bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280]"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2 text-sm leading-none font-medium">Process</Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value="P4"
                  className="mt-1 h-10 bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280]"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2 text-sm leading-none font-medium">Standard</Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value="ISO 9001"
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
                <Label className="flex items-center gap-2 text-sm leading-none font-medium">Shift</Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value="Morning"
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
          </div>
        </CardContent>
      </Card>

      <Card className="border border-[#0000001A]">
        <CardContent className="p-5 space-y-4">
          <div>
            <h4 className="text-base font-semibold text-[#111827]">
              <span className="text-[#22B323]">2.</span>Captured Data
            </h4>
            <p className="text-sm text-[#6B7280] mt-1">Documentary Evidence</p>
          </div>
          <Textarea
            value={capturedData}
            onChange={(e) => setCapturedData(e.target.value)}
            placeholder=""
            className="min-h-[160px] resize-none bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280]"
          />
        </CardContent>
      </Card>

      <Card className="border border-[#0000001A]">
        <CardContent className="p-5 space-y-4">
          <div>
            <h4 className="text-base font-semibold text-[#111827]">
              <span className="text-[#22B323]">3.</span>Verification Details
            </h4>
            <p className="text-sm text-[#6B7280] mt-1">
              Mid-Level Management confirms data accuracy and SOP compliance
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className="flex items-center gap-2 text-sm leading-none font-medium text-[#111827]">
                Verifier Name<span className="text-red-500">*</span>
              </Label>
              <Input
                value={verifierName}
                onChange={(e) => setVerifierName(e.target.value)}
                className="mt-1 h-10 bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280]"
              />
            </div>
            <div>
              <Label className="flex items-center gap-2 text-sm leading-none font-medium text-[#111827]">
                Verifier ID
              </Label>
              <Input
                readOnly
                tabIndex={-1}
                value={verifierId}
                className="mt-1 h-10 bg-[#F9FAFB] border-[#E5E7EB] text-[#9CA3AF]"
              />
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-2 text-sm leading-none font-medium text-[#111827]">
              Verification Comments
            </Label>
            <Textarea
              value={verificationComments}
              onChange={(e) => setVerificationComments(e.target.value)}
              placeholder="e.g. Verified the checklist and found OK. All items reviewed against SOP-QA-001."
              className="mt-1 min-h-[120px] resize-none bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280] placeholder:text-[#9CA3AF]"
            />
          </div>

          <div className="rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3">
            <p className="text-sm font-semibold text-[#15803D]">Acknowledgement:</p>
            <ul className="mt-2 space-y-1.5 text-sm text-[#166534] list-disc pl-5">
              <li>Verify section completeness</li>
              <li>Confirm no unauthorized alterations</li>
              <li>Initiate change workflow if needed</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center pt-2">
        <Button type="button" variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          type="button"
          disabled={!canSubmitVerification}
          onClick={onSubmit}
          className="gap-2 bg-[#22B323] hover:bg-[#1a9825] text-white"
        >
          Submit Verification
          <ChevronRight size={16} />
        </Button>
      </div>
    </>
  );
}

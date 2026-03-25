"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Download } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

type ReviewDocumentStepProps = {
  title: string;
  docType: string;
  site: string;
  processName: string;
  description: string;
  onBack: () => void;
  onNext: () => void;
};

export default function ReviewDocumentStep({
  title,
  docType,
  site,
  processName,
  description,
  onBack,
  onNext,
}: ReviewDocumentStepProps) {
  const [reviewerName, setReviewerName] = useState("Director Ahmed (CTO)");
  const [reviewerRole, setReviewerRole] = useState("CTO");
  const [reviewAcknowledged, setReviewAcknowledged] = useState(false);
  const [verificationOutcome, setVerificationOutcome] = useState<"effective" | "ineffective" | null>(null);
  const [reviewComments, setReviewComments] = useState("");

  const reviewDateDisplay = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        month: "numeric",
        day: "numeric",
        year: "numeric",
      }),
    []
  );

  const documentTypeLabel = useMemo(() => {
    if (docType === "F") return "Form (F)";
    if (docType === "P") return "Policy (P)";
    return docType || "-";
  }, [docType]);

  return (
    <div className="space-y-5">

      <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 space-y-5">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-[#F9FAFB] text-[#6B7280] border-[#E5E7EB] font-normal">
            Doc/2025/S1/P1/P/D1/v1
          </Badge>
          <Badge className="bg-[#DCFCE7] text-[#15803D] hover:bg-[#DCFCE7] border border-[#BBF7D0] font-medium">
            Active
          </Badge>
        </div>

        <div>
          <p className="text-sm text-[#6B7280]">Title:</p>
          <p className="text-3xl font-bold text-[#111827]">{title || "Untitled Document"}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-9 gap-4 text-sm">
          <div>
            <p className="text-[#6B7280]">Type:</p>
            <p className="font-semibold text-[#111827]">{documentTypeLabel}</p>
          </div>
          <div>
            <p className="text-[#6B7280]">Doc Owner:</p>
            <p className="font-semibold text-[#111827]">Manager Manufacturing</p>
          </div>
          <div>
            <p className="text-[#6B7280]">Standard:</p>
            <p className="font-semibold text-[#111827]">ISO 9001</p>
          </div>
          <div>
            <p className="text-[#6B7280]">Clause:</p>
            <p className="font-semibold text-[#111827]">4.1</p>
          </div>
          <div>
            <p className="text-[#6B7280]">Sub-Clause</p>
            <p className="font-semibold text-[#111827]">4.1.6</p>
          </div>
          <div>
            <p className="text-[#6B7280]">Site:</p>
            <p className="font-semibold text-[#111827]">{site || "S1"}</p>
          </div>
          <div>
            <p className="text-[#6B7280]">Process:</p>
            <p className="font-semibold text-[#111827]">{processName || "Manufacturing"}</p>
          </div>
          <div>
            <p className="text-[#6B7280]">Doc#:</p>
            <p className="font-semibold text-[#111827]">D6</p>
          </div>
          <div>
            <p className="text-[#6B7280]">Version:</p>
            <p className="font-semibold text-[#111827]">v3</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Download size={14} />
            Download PDF
          </Button>
          <Button variant="outline" className="gap-2">
            <Download size={14} />
            Download Excel
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Reviewer Name</Label>
            <Select value={reviewerName} onValueChange={setReviewerName}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Director Ahmed (CTO)">Director Ahmed (CTO)</SelectItem>
                <SelectItem value="Manager Manufacturing">Manager Manufacturing</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Role / Designation</Label>
            <Select value={reviewerRole} onValueChange={setReviewerRole}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CTO">CTO</SelectItem>
                <SelectItem value="Director">Director</SelectItem>
                <SelectItem value="Manager">Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {description ? (
          <div className="mt-4 rounded-lg border border-[#F3F4F6] bg-[#FAFAFA] px-4 py-3 text-sm text-[#4B5563]">
            {description}
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
        <div className="mb-4">
          <h4 className="text-base font-bold text-[#111827]">2.1 Review Points</h4>
          <p className="text-sm text-[#6B7280] mt-1">Checking if the Rule Works!</p>
        </div>

        <div className="rounded-lg bg-[#F0F7FF] border-l-4 border-l-[#3B82F6] pl-4 pr-4 py-4 text-sm">
          <ol className="list-decimal pl-5 space-y-3 text-[#111827]">
            <li>
              <span className="font-semibold">Associated Standards:</span>{" "}
              <span className="text-[#6B7280] font-normal">
                Confirm relevant international / national standards have been reviewed (if applicable).
              </span>
            </li>
            <li>
              <span className="font-semibold">Organizational Procedures:</span>{" "}
              <span className="text-[#6B7280] font-normal">
                Verify related procedures have been checked for adequacy and consistency.
              </span>
            </li>
            <li>
              <span className="font-semibold">4M Change Verification:</span>
              <ul className="mt-2 ml-4 list-disc space-y-1 text-[#6B7280] font-normal">
                <li>
                  <span className="font-semibold text-[#111827]">Man</span> – Roles, responsibilities, or competency requirements reviewed.
                </li>
                <li>
                  <span className="font-semibold text-[#111827]">Material</span> – Inputs, resources, or specifications assessed.
                </li>
                <li>
                  <span className="font-semibold text-[#111827]">Method</span> – Processes, workflows, or instructions confirmed.
                </li>
                <li>
                  <span className="font-semibold text-[#111827]">Machine</span> – Tools, equipment, or systems validated.
                </li>
              </ul>
            </li>
            <li>
              <span className="font-semibold">Legal &amp; Regulatory Requirements:</span>{" "}
              <span className="text-[#6B7280] font-normal">
                Compliance with all applicable laws, regulations, and customer requirements confirmed.
              </span>
            </li>
            <li>
              <span className="font-semibold">Document Accuracy &amp; Control:</span>
              <ul className="mt-2 ml-4 list-disc space-y-1 text-[#6B7280] font-normal">
                <li>Purpose, scope, and content remain clear, current, and correct.</li>
                <li>Version control, references, and linked documents are up to date.</li>
                <li>Obsolete versions identified and marked for withdrawal.</li>
              </ul>
            </li>
            <li>
              <span className="font-semibold">Process &amp; Performance Impact:</span>{" "}
              <span className="text-[#6B7280] font-normal">
                Potential impacts on quality, safety, environment, and performance evaluated. Risks and opportunities documented where necessary.
              </span>
            </li>
            <li>
              <span className="font-semibold">Linkage &amp; References:</span>{" "}
              <span className="text-[#6B7280] font-normal">
                All associated and supporting documents have been linked to ensure completeness and performance of the document/action.
              </span>
            </li>
            <li>
              <span className="font-semibold">Activity Feed Verification:</span>{" "}
              <span className="text-[#6B7280] font-normal">
                Notification and acknowledgement alerts have been checked; no conflicts remain in the &quot;Activity Feed&quot; section.
              </span>
            </li>
            <li>
              <span className="font-semibold">Corrective Action Record:</span>{" "}
              <span className="text-[#6B7280] font-normal">
                For cases of Edit, Obsolete, or Transfer, the document owner has provided satisfactory comments and corrective action records.
              </span>
            </li>
            <li>
              <span className="font-semibold">Stakeholder Notification:</span>{" "}
              <span className="text-[#6B7280] font-normal">
                All relevant concerns and stakeholders have been informed about the change in the document/action.
              </span>
            </li>
            <li>
              <span className="font-semibold">Integrity &amp; Accuracy:</span>{" "}
              <span className="text-[#6B7280] font-normal">
                Digital issuance complies with ISO 9001:2015 clause 7.5 requirements, ensuring the reliability, authenticity, and integrity of documented information.
              </span>
            </li>
          </ol>
        </div>

        <div className="mt-4 rounded-lg bg-[#FFFBEB] border-l-4 border-l-[#FACC15] pl-4 pr-4 py-4 flex gap-3 items-start">
          <Checkbox
            id="review-ack"
            checked={reviewAcknowledged}
            onCheckedChange={(v) => setReviewAcknowledged(v === true)}
            className="mt-1"
          />
          <div className="space-y-1 min-w-0">
            <label htmlFor="review-ack" className="font-semibold text-[#111827] cursor-pointer block">
              Acknowledgement
            </label>
            <p className="text-sm text-[#6B7280]">I confirm that I have taken full care and professional responsibility in reviewing the above document/action.</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 space-y-6">
        <div>
          <h4 className="text-base font-bold text-[#111827]">2.2 Verification Outcome</h4>
          <p className="text-sm text-[#6B7280] mt-2 leading-relaxed">
            Effective means producing intended results, while ineffective means not producing them. It also means action that is sufficient or insufficient to achieve a purpose, respectively.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-bold text-[#111827]">Decision (Yes-Effective / No-Ineffective)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setVerificationOutcome("effective")}
              className={cn(
                "flex gap-3 rounded-lg border-2 p-4 text-left transition-colors",
                verificationOutcome === "effective"
                  ? "border-[#16A34A] bg-[#F0FDF4]"
                  : "border-[#E5E7EB] bg-white hover:bg-[#FAFAFA]"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2",
                  verificationOutcome === "effective"
                    ? "border-[#16A34A] bg-[#16A34A]"
                    : "border-[#D1D5DB] bg-white"
                )}
                aria-hidden
              >
                {verificationOutcome === "effective" ? <Check className="h-3 w-3 text-white" strokeWidth={3} /> : null}
              </span>
              <div className="min-w-0 space-y-1">
                <p className="font-semibold text-[#111827]">Effective - Close Document</p>
                <p className="text-sm text-[#6B7280]">Proceed to next step Approval</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setVerificationOutcome("ineffective")}
              className={cn(
                "flex gap-3 rounded-lg border-2 p-4 text-left transition-colors",
                verificationOutcome === "ineffective"
                  ? "border-[#DC2626] bg-[#FEF2F2]"
                  : "border-[#E5E7EB] bg-white hover:bg-[#FAFAFA]"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2",
                  verificationOutcome === "ineffective"
                    ? "border-[#DC2626] bg-[#DC2626]"
                    : "border-[#D1D5DB] bg-white"
                )}
                aria-hidden
              >
                {verificationOutcome === "ineffective" ? <Check className="h-3 w-3 text-white" strokeWidth={3} /> : null}
              </span>
              <div className="min-w-0 space-y-1">
                <p className="font-semibold text-[#111827]">Ineffective - Re-open Document</p>
                <p className="text-sm text-[#6B7280]">
                  Send back to initiator of the document step 1 draft/create for corrective action and resubmission.
                </p>
              </div>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-bold text-[#111827]">Comments</Label>
          <Textarea
            value={reviewComments}
            onChange={(e) => setReviewComments(e.target.value)}
            placeholder="Enter your review comments here..."
            className="min-h-[120px] resize-y bg-[#F9FAFB] border-[#E5E7EB] text-[#111827] placeholder:text-[#9CA3AF]"
          />
        </div>

        <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:gap-8">
            <span className="text-sm font-bold text-[#111827] shrink-0">Reviewer Name &amp; Identification#:</span>
            <span className="text-sm text-[#6B7280] sm:text-right">[Login/System Generated]</span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:gap-8">
            <span className="text-sm font-bold text-[#111827] shrink-0">Review Date:</span>
            <span className="text-sm font-semibold text-[#111827] sm:text-right">{reviewDateDisplay}</span>
          </div>
          <p className="text-xs italic text-[#6B7280] pt-1">This document is valid without a signature</p>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!reviewAcknowledged || !verificationOutcome}>
          Send to Approval
        </Button>
      </div>
    </div>
  );
}


"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Paperclip,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import AuditWorkflowHeader from "@/components/audit/AuditWorkflowHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function CreateAuditStep5Page() {
  const params = useParams();
  const orgId = params?.orgId as string;

  const [verificationOutcome, setVerificationOutcome] = useState<
    "effective" | "ineffective"
  >("effective");
  const [auditorComments, setAuditorComments] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEvidenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setEvidenceFiles((prev) => [...prev, ...Array.from(files)]);
    e.target.value = "";
  };

  const auditTrailText = `Verification Started\nJohn Smith (Lead Auditor) • 03-Feb-2026 14:20\n\nAwaiting Final Verification\n---`;

  const handleCopyAuditTrail = async () => {
    try {
      await navigator.clipboard.writeText(auditTrailText);
      toast.success("Audit trail copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="space-y-6">
      <AuditWorkflowHeader currentStep={5} exitHref="../.." />
      <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        {/* Main title with thick green vertical bar to the left */}
        <div className="flex items-center">
          <div className="h-9 w-1.5 shrink-0 rounded-full bg-green-500" />
          <h1 className="pl-3 text-xl font-bold uppercase tracking-wide text-gray-900">
            EFFECTIVENESS VERIFICATION
          </h1>
        </div>

        {/* Verification Outcome */}
        <div className="mt-8 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-gray-900">
            VERIFICATION OUTCOME
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setVerificationOutcome("effective")}
              className={`flex flex-col items-center justify-center gap-3 rounded-lg p-6 text-center transition-colors ${
                verificationOutcome === "effective"
                  ? "border-2 border-green-500 bg-green-50 text-green-700"
                  : "border border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <CheckCircle
                className={`h-14 w-14 ${
                  verificationOutcome === "effective"
                    ? "text-green-600"
                    : "text-gray-400"
                }`}
              />
              <span className="text-sm font-bold uppercase tracking-wide">
                EFFECTIVE
              </span>
            </button>
            <button
              type="button"
              onClick={() => setVerificationOutcome("ineffective")}
              className={`flex flex-col items-center justify-center gap-3 rounded-lg p-6 text-center transition-colors ${
                verificationOutcome === "ineffective"
                  ? "border-2 border-green-500 bg-green-50 text-green-700"
                  : "border border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <XCircle
                className={`h-14 w-14 ${
                  verificationOutcome === "ineffective"
                    ? "text-green-600"
                    : "text-gray-500"
                }`}
              />
              <span className="text-sm font-bold uppercase tracking-wide">
                INEFFECTIVE
              </span>
            </button>
          </div>
          <div className="flex gap-4 rounded-lg border border-green-200 bg-green-50 px-5 py-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-green-300 bg-green-100 text-green-600">
              <RefreshCw className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-green-800">
                SYSTEM LOGIC
              </p>
              <p className="mt-1 italic leading-relaxed text-green-900/90">
                Step 4 (Corrective Action) Marking as{" "}
                <span className="font-bold not-italic text-green-700">
                  Ineffective
                </span>{" "}
                will automatically route the workflow back to and flag the
                Auditee for a revised root cause analysis and corrective
                action.
              </p>
            </div>
          </div>
        </div>

        {/* Auditor's Verification Comments */}
        <div className="mt-8 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-900">
            AUDITOR&apos;S VERIFICATION COMMENTS
          </h2>
          <Textarea
            placeholder="Detail the audit evidence used for verification (e.g., site visit on 04-Feb, review of..."
            className="min-h-28 rounded-lg border-gray-200 bg-white"
            rows={4}
            value={auditorComments}
            onChange={(e) => setAuditorComments(e.target.value)}
          />
        </div>

        {/* Revised Risk Severity & Attach Evidence - horizontal */}
        <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-8">
          <div className="min-w-0 flex-1 space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-900">
              REVISED RISK SEVERITY
            </h2>
            <div className="rounded-lg border border-gray-200 bg-gray-100 px-4 py-3 text-base text-gray-800">
              Low (Level 2)
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-900">
              ATTACH EVIDENCE
            </h2>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleEvidenceChange}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 border-gray-200 bg-white py-6 text-gray-700 hover:bg-gray-50 sm:w-auto"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-4 w-4 text-gray-600" />
              ATTACH EVIDENCE
            </Button>
            {evidenceFiles.length > 0 && (
              <p className="text-xs text-gray-600">
                {evidenceFiles.length} file(s) selected
              </p>
            )}
          </div>
        </div>

        {/* Verification Audit Trail */}
        <div className="mt-8 space-y-4 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-900">
              VERIFICATION AUDIT TRAIL
            </h2>
            <button
              type="button"
              onClick={handleCopyAuditTrail}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              title="Copy audit trail"
              aria-label="Copy audit trail"
            >
              <ClipboardCheck className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-0">
            {/* First entry: solid green vertical bar alongside */}
            <div className="border-l-4 border-green-500 pl-4 pb-1">
              <p className="font-semibold text-gray-900">
                Verification Started
              </p>
              <p className="text-sm text-gray-500">
                John Smith (Lead Auditor) • 03-Feb-2026 14:20
              </p>
            </div>
            {/* Second entry: dashed light gray vertical bar, pending */}
            <div className="mt-3 border-l-4 border-dashed border-gray-300 pl-4">
              <p className="font-medium text-gray-500">
                Awaiting Final Verification
              </p>
              <p className="text-sm text-gray-400">---</p>
            </div>
          </div>
        </div>
      </div>

      {/* Step navigation */}
      <div className="flex items-center justify-between px-6 py-4">
        <Button
          variant="outline"
          className="border-gray-300 text-gray-600 hover:bg-gray-50"
          asChild
        >
          <Link
            href={`/dashboard/${orgId}/audit/create/4`}
            className="inline-flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous Step
          </Link>
        </Button>
        <Button
          className="bg-green-600 text-white hover:bg-green-700"
          asChild
        >
          <Link
            href={`/dashboard/${orgId}/audit/create/6`}
            className="inline-flex items-center gap-2"
          >
            Save & Continue
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

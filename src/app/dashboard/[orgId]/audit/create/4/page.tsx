"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { useRef, useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Info, Paperclip, Save, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import AuditWorkflowHeader from "@/components/audit/AuditWorkflowHeader";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";

import "froala-editor/css/froala_editor.pkgd.min.css";
import "froala-editor/css/froala_style.min.css";

const FroalaEditor = dynamic(() => import("react-froala-wysiwyg"), {
  ssr: false,
});

export default function CreateAuditStep4Page() {
  const params = useParams();
  const orgId = params?.orgId as string;

  const [containmentDescription, setContainmentDescription] = useState("");
  const [responsiblePerson, setResponsiblePerson] = useState("");
  const [targetCompletionDate, setTargetCompletionDate] = useState<Date | undefined>(undefined);
  const [rootCauseNarrative, setRootCauseNarrative] = useState("");
  const [similarProcessesImpacted, setSimilarProcessesImpacted] = useState<
    "yes" | "no" | null
  >(null);
  const [rootCauseAnalysisResult, setRootCauseAnalysisResult] = useState("");
  const [riskSeverity, setRiskSeverity] = useState<
    "high" | "medium" | "low" | null
  >(null);
  const [auditeeComments, setAuditeeComments] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
  const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const valid: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!ALLOWED_TYPES.includes(file.type)) continue;
      if (file.size > MAX_FILE_SIZE) continue;
      valid.push(file);
    }
    setAttachedFiles((prev) => [...prev, ...valid]);
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      <AuditWorkflowHeader currentStep={4} exitHref="../.." />
      <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-red-600">
          TO BE RESPONDED BY THE AUDITEE
        </p>
        <h1 className="mt-2 text-xl font-bold uppercase tracking-wide text-gray-900">
          STEP 4 OF 6: CORRECTIVE ACTION MANAGEMENT
        </h1>
        <div className="mt-6 flex gap-4 rounded-lg border border-blue-200 bg-blue-50/80 px-5 py-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-300 bg-blue-100 text-blue-600">
            <Info className="h-4 w-4" />
          </div>
          <p className="min-w-0 flex-1 italic leading-relaxed text-blue-900/90">
            Effective corrective actions are those taken by the auditee to
            eliminate the root cause of a nonconformity, prevent its recurrence,
            and ensure long-term system improvement. They must be specific,
            measurable, achievable, relevant, and time-bound.
          </p>
        </div>

        {/* Containment Action Section */}
        <div className="mt-8 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-900">
            CONTAINMENT ACTION, INCLUDING TIMING AND RESPONSIBLE PERSON:
          </h2>
          <p className="italic text-sm leading-relaxed text-slate-600">
            Prompt action taken to control the issue and prevent further impact
            until a permanent solution is implemented. Typical for Minor
            Nonconformities. Major Nonconformities will include systematic
            corrective actions, timelines, and responsible parties.
          </p>
          <div className="space-y-2">
            <Label className="text-sm font-bold uppercase tracking-wide text-gray-900">
              CONTAINMENT ACTION DESCRIPTION
            </Label>
            <Textarea
              placeholder="Describe the immediate actions taken to contain the nonconformity..."
              className="min-h-24 rounded-lg border-gray-300"
              rows={4}
              value={containmentDescription}
              onChange={(e) => setContainmentDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-bold uppercase tracking-wide text-gray-900">
                RESPONSIBLE PERSON
              </Label>
              <Input
                placeholder="Full Name / Job Title"
                className="rounded-lg border-gray-300"
                value={responsiblePerson}
                onChange={(e) => setResponsiblePerson(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold uppercase tracking-wide text-gray-900">
                TARGET COMPLETION DATE
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start rounded-lg border-gray-300 text-left font-normal",
                      !targetCompletionDate && "text-gray-500"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {targetCompletionDate
                      ? format(targetCompletionDate, "MM-dd-yyyy")
                      : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={targetCompletionDate}
                    onSelect={setTargetCompletionDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Root Cause of the Problem */}
        <div className="mt-8 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-900">
            ROOT CAUSE OF THE PROBLEM:
          </h2>
          <p className="italic text-sm leading-relaxed text-slate-600">
            The underlying reason for an issue, identified through analysis to
            ensure a permanent solution and prevent recurrence. Auditors may use
            methods like 5 Whys, Fishbone Diagram (Ishikawa), Pareto Analysis, or
            FMEA.
          </p>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <FroalaEditor
              tag="textarea"
              model={rootCauseNarrative}
              onModelChange={setRootCauseNarrative}
              config={{
                heightMin: 180,
                placeholderText:
                  "Enter the comprehensive root cause analysis narrative...",
                imageUploadURL: "/api/files/froala/upload",
                imageUploadMethod: "POST",
                imageAllowedTypes: ["jpeg", "jpg", "png", "webp"],
                imageMaxSize: 5 * 1024 * 1024,
              }}
            />
          </div>
        </div>

        {/* Similar Processes Impacted */}
        <div className="mt-8 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-900">
            SIMILAR PROCESSES IMPACTED (IF ANY):
          </h2>
          <p className="italic text-sm leading-relaxed text-slate-600">
            Are there any processes that are affected? Please answer either yes
            or no. If the answer is yes, please provide a list of all the
            processes that are affected, making sure to include all relevant
            processes in the list.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-start">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSimilarProcessesImpacted("yes")}
              className={cn(
                "rounded-lg border-2 px-6 py-2.5 text-sm font-bold uppercase tracking-wide transition-colors",
                similarProcessesImpacted === "yes"
                  ? "border-gray-900 bg-gray-900 text-white hover:bg-gray-800"
                  : "border-gray-300 bg-white text-gray-900 hover:border-gray-400 hover:bg-gray-50"
              )}
            >
              YES
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSimilarProcessesImpacted("no")}
              className={cn(
                "rounded-lg border-2 px-6 py-2.5 text-sm font-bold uppercase tracking-wide transition-colors",
                similarProcessesImpacted === "no"
                  ? "border-gray-900 bg-gray-900 text-white hover:bg-gray-800"
                  : "border-gray-300 bg-white text-gray-900 hover:border-gray-400 hover:bg-gray-50"
              )}
            >
              NO
            </Button>
          </div>
        </div>

        {/* Root Cause Analysis & Result */}
        <div className="mt-8 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-900">
            ROOT CAUSE ANALYSIS & RESULT:
          </h2>
          <div className="flex gap-4 rounded-lg border border-blue-200 bg-gray-50 px-5 py-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-500">
              <Info className="h-4 w-4" />
            </div>
            <p className="min-w-0 flex-1 italic leading-relaxed text-slate-700">
              <span className="font-medium not-italic">Example Guidance:</span>{" "}
              &ldquo;Root cause analysis identified a gap in process control
              and awareness that led to the nonconformity. Corrective actions
              were implemented to address this gap. Results confirm improved
              process compliance and no recurrence observed.&rdquo;
            </p>
          </div>
          <Textarea
            placeholder="Provide the multiline narrative result of the corrective action implementation..."
            className="min-h-32 rounded-lg border-gray-300"
            rows={6}
            value={rootCauseAnalysisResult}
            onChange={(e) => setRootCauseAnalysisResult(e.target.value)}
          />
        </div>

        {/* Risk Severity (Review) */}
        <div className="mt-8 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-900">
            RISK SEVERITY (REVIEW):
          </h2>
          <p className="italic text-sm leading-relaxed text-slate-600">
            Following corrective actions and root cause analysis, the auditee
            should review risk severity to reflect the potential impact and
            likelihood of nonconformity, guiding prioritization, escalation, and
            follow-up.
          </p>
          <div className="flex flex-wrap gap-4">
            {(["high", "medium", "low"] as const).map((level) => (
              <Button
                key={level}
                type="button"
                variant="outline"
                onClick={() => setRiskSeverity(level)}
                className={cn(
                  "rounded-lg border-2 px-6 py-2.5 text-sm font-bold uppercase tracking-wide transition-colors",
                  riskSeverity === level
                    ? "border-gray-900 bg-gray-900 text-white hover:bg-gray-800"
                    : "border-gray-300 bg-gray-100 text-gray-900 hover:border-gray-400 hover:bg-gray-200"
                )}
              >
                {level}
              </Button>
            ))}
          </div>
        </div>

        {/* Auditee Comments (Mandatory) */}
        <div className="mt-8 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-900">
            AUDITEE COMMENTS (MANDATORY)
          </h2>
          <Textarea
            placeholder="Final auditee observations regarding the CA effectiveness and risk mitigation..."
            className="min-h-32 rounded-lg border-gray-300"
            rows={6}
            value={auditeeComments}
            onChange={(e) => setAuditeeComments(e.target.value)}
          />
        </div>

        {/* Attach File */}
        <div className="mt-8">
          <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-6">
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/jpg,image/png"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                <Paperclip className="h-6 w-6" />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-900">
                ATTACH FILE
              </h2>
              <p className="text-xs text-gray-500">
                ALLOWED: JPG / JPEG / PNG • MAX SIZE: 2 MB
              </p>
              {attachedFiles.length > 0 && (
                <p className="text-xs text-gray-600">
                  {attachedFiles.length} file(s) selected
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                BROWSE FILES
              </Button>
            </div>
          </div>
        </div>

        {/* Summary & Actions Card */}
        <div className="relative mt-8 overflow-hidden rounded-xl border-t-4 border-green-500/50 bg-slate-800 px-6 py-6 text-white shadow-lg">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-green-400">
                  AUDITEE NAME & UIN
                </p>
                <p className="mt-1 font-bold text-white">SARAH MILLER</p>
                <p className="text-sm text-white/90">UIN-SM-9901</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-green-400">
                  PROCESS
                </p>
                <p className="mt-1 font-bold text-white">CORE OPERATIONS</p>
                <p className="text-sm text-white/90">SYS-GEN-2026</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-green-400">
                  DATE
                </p>
                <p className="mt-1 font-bold text-white">04-02-2026</p>
                <p className="text-sm text-white/90">AUTOMATED LOG</p>
              </div>
            </div>
            <div className="rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-3 text-right sm:shrink-0">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-300">
                VALIDATION NOTE
              </p>
              <p className="mt-1 text-xs text-slate-400">
                This document is valid without a signature
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Button
              type="button"
              variant="outline"
              className="inline-flex items-center gap-2 rounded-lg border-2 border-green-500 bg-slate-800 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-slate-700"
            >
              <Save className="h-4 w-4" />
              SAVE
            </Button>
            <Button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-green-500"
            >
              <Send className="h-4 w-4" />
              SUBMIT TO AUDITOR
            </Button>
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
            href={`/dashboard/${orgId}/audit/create/3`}
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
            href={`/dashboard/${orgId}/audit/create/5`}
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

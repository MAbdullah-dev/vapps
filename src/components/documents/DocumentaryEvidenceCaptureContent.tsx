"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Archive, Check, FileText, Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDashboardPath } from "@/lib/subdomain";
import { cn } from "@/lib/utils";
import CaptureEvidenceStep from "@/components/documents/steps/CaptureEvidenceStep";
import VerifyEvidenceStep from "@/components/documents/steps/VerifyEvidenceStep";
import ArchiveEvidenceStep from "@/components/documents/steps/ArchiveEvidenceStep";

type CaptureStep = {
  key: "capture" | "verify" | "archive";
  label: string;
  icon: typeof FileText;
};

const STEPS: CaptureStep[] = [
  { key: "capture", label: "Capture", icon: FileText },
  { key: "verify", label: "Verify", icon: ShieldCheck },
  { key: "archive", label: "Archive", icon: Archive },
];

const STEP_ORDER: CaptureStep["key"][] = ["capture", "verify", "archive"];

function stepIndex(key: CaptureStep["key"]): number {
  return STEP_ORDER.indexOf(key) + 1;
}

export default function DocumentaryEvidenceCaptureContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = (params?.orgId as string) || "";
  const documentsHref = orgId ? getDashboardPath(orgId, "documents") : "/";
  const recordsHref = orgId ? getDashboardPath(orgId, "documents/documentary-evidence") : "/";
  const templateRef = searchParams.get("template") || "Doc/2025/S1/P1/P/D1/v1";
  const [currentStep, setCurrentStep] = useState<CaptureStep["key"]>("capture");

  return (
    <div className="space-y-6">
      <Card className="border border-[#0000001A] py-4">
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-[36px] leading-tight font-bold text-[#111827]">Documentary Evidence Records</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Save size={14} />
                Save Draft
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href={documentsHref}>Exit to Dashboard</Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {STEPS.map(({ key, label, icon: Icon }) => {
              const s = stepIndex(key);
              const active = stepIndex(currentStep);
              const isCurrent = active === s;
              const isDone = active > s;
              const DisplayIcon = isDone ? Check : Icon;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCurrentStep(key)}
                  className={cn(
                    "rounded-lg border px-4 py-3 transition-all",
                    "flex flex-col items-center justify-center min-h-[92px] gap-2",
                    isCurrent
                      ? "bg-[#22B323] border-[#22B323] text-white"
                      : isDone
                        ? "bg-[#EEFFF3] border-[#22B323] text-[#15803D]"
                        : "bg-[#F3F4F6] border-[#E5E7EB] text-[#6B7280] hover:bg-[#EBEEF2]"
                  )}
                >
                  <span
                    className={cn(
                      "h-8 w-8 rounded-full border flex items-center justify-center",
                      isCurrent
                        ? "border-white/70 bg-white/15"
                        : isDone
                          ? "border-[#22B323] bg-[#22B323]"
                          : "border-[#D1D5DB] bg-white"
                    )}
                  >
                    <DisplayIcon
                      size={15}
                      className={cn(isCurrent || isDone ? "text-white" : "text-[#9CA3AF]")}
                    />
                  </span>
                  <span className="text-xs font-medium">{label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <nav aria-label="Breadcrumb" className="text-sm">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href={documentsHref} className="text-[#6B7280] hover:text-[#111827]">
              Documents
            </Link>
          </li>
          <li className="text-[#9CA3AF]">›</li>
          <li>
            <Link href={recordsHref} className="text-[#6B7280] hover:text-[#111827]">
              Documentary Evidence Records
            </Link>
          </li>
          <li className="text-[#9CA3AF]">›</li>
          <li>
            {currentStep === "capture" ? (
              <span className="font-semibold text-[#111827]">Capture</span>
            ) : (
              <button
                type="button"
                className="text-[#6B7280] hover:text-[#111827]"
                onClick={() => setCurrentStep("capture")}
              >
                Capture
              </button>
            )}
          </li>
          {(currentStep === "verify" || currentStep === "archive") && (
            <>
              <li className="text-[#9CA3AF]">›</li>
              <li>
                {currentStep === "verify" ? (
                  <span className="font-semibold text-[#111827]">Verify</span>
                ) : (
                  <button
                    type="button"
                    className="text-[#6B7280] hover:text-[#111827]"
                    onClick={() => setCurrentStep("verify")}
                  >
                    Verify
                  </button>
                )}
              </li>
            </>
          )}
          {currentStep === "archive" && (
            <>
              <li className="text-[#9CA3AF]">›</li>
              <li className="font-semibold text-[#111827]">Archive</li>
            </>
          )}
        </ol>
      </nav>

      {currentStep === "capture" && (
        <CaptureEvidenceStep
          templateRef={templateRef}
          templatesHref={recordsHref}
          onSubmit={() => setCurrentStep("verify")}
        />
      )}
      {currentStep === "verify" && (
        <VerifyEvidenceStep
          templateRef={templateRef}
          onBack={() => setCurrentStep("capture")}
          onSubmit={() => setCurrentStep("archive")}
        />
      )}
      {currentStep === "archive" && (
        <ArchiveEvidenceStep
          templateRef={templateRef}
          onBack={() => setCurrentStep("verify")}
          onConfirmArchive={() => router.push(recordsHref)}
        />
      )}
    </div>
  );
}

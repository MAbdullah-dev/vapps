"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Calendar,
  AlertTriangle,
  CheckSquare,
  ClipboardList,
  CheckCircle,
  Check,
  Save,
  Info,
} from "lucide-react";

const STEPS = [
  { step: 1, label: "Managing Audit Program", icon: FileText },
  { step: 2, label: "Audit Plan", icon: Calendar },
  { step: 3, label: "Audit Findings", icon: AlertTriangle },
  { step: 4, label: "Corrective Action", icon: CheckSquare },
  { step: 5, label: "Verification", icon: ClipboardList },
  { step: 6, label: "Closure", icon: CheckCircle },
] as const;

interface AuditWorkflowHeaderProps {
  currentStep: number;
  saveDraftHref?: string;
  exitHref?: string;
}

export default function AuditWorkflowHeader({
  currentStep,
  saveDraftHref = "#",
  exitHref = "../..",
}: AuditWorkflowHeaderProps) {
  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            Audit Workflow Management
          </h2>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={saveDraftHref} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Save Draft
              </Link>
            </Button>

            <Button variant="outline" size="sm" asChild>
              <Link href={exitHref}>Exit to Dashboard</Link>
            </Button>
          </div>
        </div>

        {/* Progress */}
        <div className="relative pt-4 pb-2">
          {/* Track */}
          <div className="absolute left-0 right-0 top-[33px] h-2 rounded-full bg-gray-200 z-0" 
          style={{ top: "33px" }}
          />

          {/* Filled progress */}
          <div
            className="absolute left-0 top-[33px] h-2 rounded-full bg-green-500 z-0 transition-all duration-300"
            style={{
              width: `${((currentStep - 0.5) / STEPS.length) * 100}%`,
              top: "33px",
            }}
          />

          {/* Steps */}
          <div className="relative z-10 grid grid-cols-6 gap-2">
            {STEPS.map(({ step, label, icon: Icon }) => {
              const isCompleted = currentStep > step;
              const isCurrent = currentStep === step;

              const circleClasses = isCompleted
                ? "bg-green-500 border-green-600 text-white"
                : isCurrent
                ? "bg-white border-green-600 text-green-600"
                : "bg-gray-50 border-gray-300 text-gray-400";

              const IconComponent = isCompleted || isCurrent ? Check : Icon;

              return (
                <div key={step} className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ring-4 ring-white shadow-sm ${circleClasses}`}
                  >
                    <IconComponent className="h-5 w-5" strokeWidth={2.5} />
                  </div>

                  <div className="mt-3 text-center">
                    <div className="text-xs uppercase tracking-wide text-gray-500">
                      Step {step}
                    </div>
                    <div
                      className={`mt-1 text-xs leading-tight ${
                        isCurrent
                          ? "font-semibold text-green-700 bg-green-50 rounded px-1"
                          : isCompleted
                          ? "font-semibold text-green-600"
                          : "text-gray-500"
                      }`}
                    >
                      {label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="mt-6 flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
        <Info className="h-5 w-5 shrink-0 text-gray-500" />
        <p className="text-sm text-gray-600">
          Strategic Framework That Defines The Full Audit Universe, Priorities,
          And Timing.
        </p>
      </div>
    </>
  );
}

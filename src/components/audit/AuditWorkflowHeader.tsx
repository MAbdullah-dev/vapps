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
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  orgId?: string;
  saveDraftHref?: string;
  exitHref?: string;
}

export default function AuditWorkflowHeader({
  currentStep,
  orgId,
  saveDraftHref = "#",
  exitHref = "../..",
}: AuditWorkflowHeaderProps) {
  const getStepHref = (step: number) => {
    if (!orgId) return "#";
    return `/dashboard/${orgId}/audit/create/${step}`;
  };

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

        {/* Tabs */}
        <div className="flex gap-2">
          {STEPS.map(({ step, label, icon: Icon }) => {
            const isFirstStep = step === 1;
            const isSecondStep = step === 2;
            const isLastStep = step === STEPS.length; // Last step (step 6)
            
            // Only steps 1, 2, and 6 are accessible
            const isAccessible = isFirstStep || isSecondStep || isLastStep;
            
            // Only accessible steps can be marked as completed (locked tabs never show as completed)
            const isCompleted = isAccessible && currentStep > step;
            const isCurrent = currentStep === step;
            
            // Determine if unlocked (for accessible steps only)
            const isUnlocked = isAccessible && (
              isCompleted || 
              isCurrent || 
              (isSecondStep && currentStep === 1) || // Step 2 unlocked when on step 1
              (isLastStep && currentStep !== STEPS.length && !isCompleted) // Step 6 unlocked unless it's current
            );

            // Tab container classes - rounded rectangular tabs
            const tabClasses = cn(
              "flex-1 rounded-lg border-2 transition-all duration-200",
              "flex flex-col items-center justify-center py-4 px-2 min-h-[100px]",
              !isAccessible
                ? "bg-gray-50 border-gray-200 cursor-not-allowed opacity-60" // Always disabled for steps 3, 4, 5
                : isCompleted
                ? "bg-green-50 border-green-600 hover:bg-green-100 cursor-pointer"
                : isCurrent
                ? "bg-green-600 border-green-600 cursor-pointer" // Solid green, border matches background
                : isUnlocked
                ? "bg-white border-green-600 hover:bg-green-50 cursor-pointer" // White with green border
                : "bg-gray-50 border-gray-200 cursor-not-allowed opacity-60" // Disabled
            );

            // Icon circle classes
            const iconCircleClasses = cn(
              "flex h-10 w-10 items-center justify-center rounded-full border-2 mb-2",
              isCompleted
                ? "bg-green-500 border-green-600"
                : "bg-white border-gray-300" // White circle for current, unlocked, and disabled
            );

            // Icon component - completed shows checkmark, others show original icon
            const IconComponent = isCompleted ? Check : Icon;

            // Icon color classes
            const iconColorClasses = cn(
              "h-5 w-5",
              isCompleted
                ? "text-white"
                : isCurrent || isUnlocked
                ? "text-gray-600" // Gray icon for current and unlocked tabs
                : "text-gray-400" // Light gray for disabled tabs
            );

            // Text classes
            const textClasses = cn(
              "text-xs font-semibold text-center leading-tight px-1",
              isCompleted
                ? "text-green-700"
                : isCurrent
                ? "text-white"
                : isUnlocked
                ? "text-gray-700" // Dark gray for unlocked
                : "text-gray-400" // Light gray for disabled
            );

            const stepHref = getStepHref(step);

            const tabContent = (
              <>
                <div className={iconCircleClasses}>
                  <IconComponent className={iconColorClasses} strokeWidth={2.5} />
                </div>
                <div className={textClasses}>{label}</div>
              </>
            );

            // Only allow navigation to accessible steps that are completed, current, or unlocked
            if (!isAccessible || (!isCompleted && !isCurrent && !isUnlocked)) {
              return (
                <div key={step} className={tabClasses}>
                  {tabContent}
                </div>
              );
            }

            return (
              <Link
                key={step}
                href={stepHref}
                className={tabClasses}
              >
                {tabContent}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

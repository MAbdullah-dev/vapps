"use client";

import AuditWorkflowHeader from "@/components/audit/AuditWorkflowHeader";

export default function CreateAuditStep4Page() {
  return (
    <div className="space-y-6">
      <AuditWorkflowHeader currentStep={4} exitHref="../.." />
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
        Step 4
      </div>
    </div>
  );
}

"use client";

import AuditWorkflowHeader from "@/components/audit/AuditWorkflowHeader";

export default function CreateAuditStep3Page() {
  return (
    <div className="space-y-6">
      <AuditWorkflowHeader currentStep={3} exitHref="../.." />
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
        Step 3
      </div>
    </div>
  );
}

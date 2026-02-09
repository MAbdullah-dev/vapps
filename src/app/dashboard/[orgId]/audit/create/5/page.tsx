"use client";

import AuditWorkflowHeader from "@/components/audit/AuditWorkflowHeader";

export default function CreateAuditStep5Page() {
  return (
    <div className="space-y-6">
      <AuditWorkflowHeader currentStep={5} exitHref="../.." />
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
        Step 5
      </div>
    </div>
  );
}

"use client";

import AuditWorkflowHeader from "@/components/audit/AuditWorkflowHeader";

export default function CreateAuditStep2Page() {
  return (
    <div className="space-y-6">
      <AuditWorkflowHeader currentStep={2} exitHref="../.." />
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
        Step 2
      </div>
    </div>
  );
}

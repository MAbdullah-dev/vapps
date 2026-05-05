"use client";

import ProcessWorkspaceLayout from "@/components/dashboard/ProcessWorkspaceLayout";

export default function IssuesLayout({ children }: { children: React.ReactNode }) {
  return <ProcessWorkspaceLayout workspaceSegment="issues">{children}</ProcessWorkspaceLayout>;
}

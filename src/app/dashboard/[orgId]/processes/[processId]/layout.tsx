"use client";

import ProcessWorkspaceLayout from "@/components/dashboard/ProcessWorkspaceLayout";

export default function ProcessLayout({ children }: { children: React.ReactNode }) {
  return <ProcessWorkspaceLayout workspaceSegment="processes">{children}</ProcessWorkspaceLayout>;
}

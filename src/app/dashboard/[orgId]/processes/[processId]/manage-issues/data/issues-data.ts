// issues-data.ts
import { Issue } from "./types";

export const issuesData: Issue[] = [
  {
    id: "1",
    ref: "Issue/2025/S1/P1/QI/Issue#1",
    title: "Missing ISO documentation for compliance review",
    tag: "Quality Issue",
    source: "Internal Audit",
    issuer: "John Doe",
    assignee: "Mary Chen",
    planDate: "11/15/2024",
    actualDate: "12/1/2024",
    dueDate: "12/15/2024",
    assignedDate: "12/15/2024",
    completedDate: "12/1/2024",
    kpi: 3,
    status: "Pending Verification",
  }
];

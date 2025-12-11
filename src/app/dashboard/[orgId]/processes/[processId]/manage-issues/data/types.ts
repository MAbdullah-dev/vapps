// types.ts
export type Issue = {
  id: string;              // internal id
  ref: string;             // "Issue/2025/S1/P1/QI/Issue#1"
  title: string;           // issue title
  tag: string;             // e.g., "Quality Issue"
  source: string;          // e.g., "Internal Audit"
  issuer: string;          // e.g., "John Doe"
  assignee: string;        // e.g., "Mary Chen"
  planDate: string;        // e.g., "11/15/2024"
  actualDate: string;      // e.g., "12/1/2024"
  dueDate: string;         // e.g., "12/15/2024"
  assignedDate: string;    // e.g., "12/15/2024"
  completedDate: string;   // e.g., "12/1/2024"
  kpi: number;             // e.g., 3
  status: string;          // e.g., "Pending Verification"
};

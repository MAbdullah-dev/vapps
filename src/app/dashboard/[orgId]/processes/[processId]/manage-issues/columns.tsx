// columns.tsx
import { ColumnDef, Row } from "@tanstack/react-table";
import { Issue } from "./data/types";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { CheckIcon, ClockIcon } from "lucide-react";

export const columns: ColumnDef<Issue>[] = [
  {
    accessorKey: "ref",
    header: "Issue Ref",
  },
  {
    accessorKey: "title",
    header: "Title",
  },
  {
    accessorKey: "tag",
    header: "Tag",
    cell: ({ row }: { row: Row<Issue> }) => {
      const tag = row.getValue("tag") as string;
      return <span className="px-2 py-1 rounded bg-purple-100 text-purple-700 text-xs">{tag}</span>;
    },
  },
  {
    accessorKey: "source",
    header: "Source",
  },
  {
    accessorKey: "issuer",
    header: "Issuer",
  },
  {
    accessorKey: "assignee",
    header: "Assignee",
  },
  {
    accessorKey: "planDate",
    header: "Plan Date",
  },
  {
    accessorKey: "actualDate",
    header: "Actual Date",
  },
  {
    accessorKey: "dueDate",
    header: "Due Date",
  },
  {
    accessorKey: "assignedDate",
    header: "Assigned Date",
  },
  {
    accessorKey: "completedDate",
    header: "Completed Date",
  },
  {
    accessorKey: "kpi",
    header: "KPI",
    cell: ({ row }: { row: Row<Issue> }) => {
      const kpi = row.getValue("kpi") as number;
      return (
        <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs flex items-center gap-1">
          <CheckIcon className="w-3 h-3" /> {kpi}
        </span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }: { row: Row<Issue> }) => {
      const status = row.getValue("status") as string;
      return (
        <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs flex items-center gap-1">
          <ClockIcon className="w-3 h-3" /> {status}
        </span>
      );
    },
  },
  {
    id: "action",
    header: "Action",
    cell: ({ row }: { row: Row<Issue> }) => {
      const issue = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Review
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => console.log("Review", issue.id)}>
              Review
            </DropdownMenuItem>
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

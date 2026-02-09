"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  EllipsisVertical,
  Funnel,
  Plus,
  Search,
  Cloud,
  Folder,
  Upload,
  History,
  Pencil,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AuditHistoryDialog from "./AuditHistoryDialog";

type Audit = {
  id: string;
  standard: string;
  scopeMethodBoundaries: string;
  auditType: string;
  site: string;
  process: string;
  clause: string;
  subclauses: string;
  ncClassification: "Major" | "Minor";
  riskLevel: string;
  plannedDate: string;
  actualDate: string;
  dueDate: string;
  kpiScore: "Consistent" | "Inconsistent" | null;
  auditStatus: string;
};

const audits: Audit[] = [
  {
    id: "AUD/2025/S1/P1/FPA/NC1",
    standard: "ISO 9001",
    scopeMethodBoundaries: "On-Site",
    auditType: "FPA",
    site: "S1",
    process: "P1",
    clause: "4.0 Context",
    subclauses: "4.2 Interested Parties",
    ncClassification: "Major",
    riskLevel: "High",
    plannedDate: "01-09-2025",
    actualDate: "",
    dueDate: "01-10-2025",
    kpiScore: null,
    auditStatus: "In-Progress",
  },
  {
    id: "AUD/2025/S1/P1/FPA/NC2",
    standard: "ISO 9001",
    scopeMethodBoundaries: "On-Site",
    auditType: "FPA",
    site: "S1",
    process: "P1",
    clause: "5.0 Leadership",
    subclauses: "5.2 Policy",
    ncClassification: "Minor",
    riskLevel: "Medium",
    plannedDate: "01-09-2025",
    actualDate: "11-09-2025",
    dueDate: "01-10-2025",
    kpiScore: "Consistent",
    auditStatus: "Success",
  },
  {
    id: "AUD/2025/S1/P1/FPA/NC3",
    standard: "ISO 9001",
    scopeMethodBoundaries: "On-Site",
    auditType: "FPA",
    site: "S1",
    process: "P1",
    clause: "6.0 Planning",
    subclauses: "6.2 Objectives",
    ncClassification: "Minor",
    riskLevel: "Low",
    plannedDate: "20-09-2025",
    actualDate: "15-09-2025",
    dueDate: "01-10-2025",
    kpiScore: null,
    auditStatus: "Pending",
  },
  {
    id: "AUD/2025/S1/P1/FPA/NC4",
    standard: "ISO 9001",
    scopeMethodBoundaries: "On-Site",
    auditType: "FPA",
    site: "S1",
    process: "P1",
    clause: "9.0 Improvement",
    subclauses: "9.2 Internal Audit",
    ncClassification: "Minor",
    riskLevel: "Low",
    plannedDate: "20-08-2025",
    actualDate: "",
    dueDate: "20-09-2025",
    kpiScore: "Inconsistent",
    auditStatus: "Fail",
  },
];

function TableHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-semibold text-gray-800">{title}</span>
      {sub && <span className="text-xs font-normal text-gray-500">{sub}</span>}
    </div>
  );
}

const getClassificationColor = (classification: string) => {
  if (classification === "Major") return "bg-red-500 text-white";
  return "bg-yellow-100 text-yellow-800";
};

const getRiskLevelColor = (riskLevel: string) => {
  if (riskLevel === "High") return "bg-red-500 text-white";
  if (riskLevel === "Medium") return "bg-yellow-100 text-yellow-800";
  return "bg-blue-100 text-blue-800";
};

const getStatusColor = (status: string) => {
  if (status === "Success") return "bg-green-100 text-green-800";
  if (status === "In-Progress") return "bg-yellow-100 text-yellow-800";
  if (status === "Fail") return "bg-red-100 text-red-700";
  return ""; // Pending: no badge
};

function getColumns(handleViewHistory: (audit: Audit) => void, handleEditAudit: (audit: Audit) => void): ColumnDef<Audit>[] {
  return [
  {
    accessorKey: "id",
    header: () => <TableHeader title="Audit Program Ref." sub="(Audit/Year/Site/Process/Audit Type/NC#)" />,
    cell: ({ row }) => <span className="font-medium text-gray-900">{row.original.id}</span>,
  },
  {
    accessorKey: "standard",
    header: () => <TableHeader title="Standard" sub="(e.g., ISO 9001, ESG & Sustainability)" />,
    cell: ({ row }) => <span className="text-gray-700">{row.original.standard}</span>,
  },
  {
    accessorKey: "scopeMethodBoundaries",
    header: () => <TableHeader title="Scope, Method & Boundaries" sub="(On-Site/Remote/Hybrid)" />,
    cell: ({ row }) => <span className="text-gray-700">{row.original.scopeMethodBoundaries}</span>,
  },
  {
    accessorKey: "auditType",
    header: () => <TableHeader title="Audit Type" sub="FPA/SPA/TPA" />,
    cell: ({ row }) => (
      <span className="bg-gray-100 text-gray-700 py-1 px-2 rounded-full text-xs font-medium">
        {row.original.auditType}
      </span>
    ),
  },
  {
    accessorKey: "site",
    header: () => <TableHeader title="Site" />,
    cell: ({ row }) => <span className="text-gray-700">{row.original.site}</span>,
  },
  {
    accessorKey: "process",
    header: () => <TableHeader title="Process" />,
    cell: ({ row }) => <span className="text-gray-700">{row.original.process}</span>,
  },
  {
    accessorKey: "clause",
    header: () => <TableHeader title="Clause" />,
    cell: ({ row }) => <span className="text-gray-700">{row.original.clause}</span>,
  },
  {
    accessorKey: "subclauses",
    header: () => <TableHeader title="Subclauses" />,
    cell: ({ row }) => <span className="text-gray-700">{row.original.subclauses}</span>,
  },
  {
    accessorKey: "ncClassification",
    header: () => <TableHeader title="NC Classification" sub="(Major/Minor)" />,
    cell: ({ row }) => {
      const label = row.original.ncClassification === "Major" ? "MA" : "mi";
      return (
        <span className={`${getClassificationColor(row.original.ncClassification)} py-1 px-2 rounded-full text-xs font-medium`}>
          {label}
        </span>
      );
    },
  },
  {
    accessorKey: "riskLevel",
    header: () => <TableHeader title="Risk Level" sub="(High/Medium/Low)" />,
    cell: ({ row }) => (
      <span className={`${getRiskLevelColor(row.original.riskLevel)} py-1 px-2 rounded-full text-xs font-medium`}>
        {row.original.riskLevel}
      </span>
    ),
  },
  {
    accessorKey: "plannedDate",
    header: () => <TableHeader title="Planned Date" />,
    cell: ({ row }) => <span className="text-gray-700">{row.original.plannedDate}</span>,
  },
  {
    accessorKey: "actualDate",
    header: () => <TableHeader title="Actual Date" />,
    cell: ({ row }) => (
      <span className="text-gray-700">{row.original.actualDate || ""}</span>
    ),
  },
  {
    accessorKey: "dueDate",
    header: () => <TableHeader title="Due Date (30 days)" />,
    cell: ({ row }) => <span className="text-gray-700">{row.original.dueDate}</span>,
  },
  {
    accessorKey: "kpiScore",
    header: () => <TableHeader title="KPI (Score)" />,
    cell: ({ row }) => {
      const score = row.original.kpiScore;
      if (!score) return <span className="text-gray-400">—</span>;
      if (score === "Consistent") return <span className="font-medium text-green-600">Consistent</span>;
      return <span className="font-medium text-red-600">Inconsistent</span>;
    },
  },
  {
    accessorKey: "auditStatus",
    header: () => (
      <TableHeader
        title="Audit Status"
        sub={"Success ≤ 30 days / In-Progress < 30 days / Pending > 30 days / Fail > 40 days"}
      />
    ),
    cell: ({ row }) => {
      const status = row.original.auditStatus;
      const badgeClass = getStatusColor(status);
      if (!badgeClass) return <span className="text-gray-700">{status}</span>;
      return (
        <span className={`${badgeClass} py-1 px-2 rounded-full text-xs font-medium`}>
          {status}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: () => <TableHeader title="Actions" sub="View Share Download PDF" />,
    cell: ({ row }) => {
      const audit = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-200"
              onClick={(e) => e.stopPropagation()}
            >
              <EllipsisVertical size={18} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => handleViewHistory(audit)}>
              <History className="mr-2 h-4 w-4" />
              View History
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEditAudit(audit)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Audit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
  ];
}

export default function AuditsContent() {
  const pathname = usePathname();
  const [historyAudit, setHistoryAudit] = useState<Audit | null>(null);
  const createAuditHref = `${pathname}/create/1`;

  const handleViewHistory = (audit: Audit) => {
    setHistoryAudit(audit);
  };

  const handleEditAudit = (audit: Audit) => {
    // TODO: open edit audit dialog
    console.log("Edit audit", audit.id);
  };

  const columns = getColumns(handleViewHistory, handleEditAudit);

  const table = useReactTable({
    data: audits,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Audits</h1>
          <p className="text-sm text-gray-600">Internal checks, reviews, and compliance status</p>
        </div>
        <Button variant="dark" className="flex items-center gap-2" asChild>
          <Link href={createAuditHref}>
            <Plus size={18} /> Create Audit
          </Link>
        </Button>
      </div>

      {/* Tenant Information Banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Cloud className="text-blue-600" size={20} />
            <div>
              <p className="text-sm font-medium text-gray-900">Active Tenant: Acme Corporation</p>
              <a href="#" className="text-xs text-blue-600 hover:underline">Auth0 Organization</a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Folder className="text-gray-600" size={18} />
              <span className="bg-yellow-100 text-yellow-800 text-xs font-medium py-1 px-2 rounded-full">
                Shared S3
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Upload className="text-gray-600" size={18} />
              <span className="text-sm text-gray-600">100 MB limit</span>
              <span className="bg-blue-600 text-white text-xs font-medium py-1 px-2 rounded-full">
                Pro
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">Total Audits</p>
          <p className="text-2xl font-bold text-gray-900">6</p>
          <p className="text-xs text-gray-400 mt-1">All time</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">Success Rate</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-gray-900">50%</p>
            <span className="bg-green-100 text-green-700 text-xs font-medium py-0.5 px-2 rounded-full">
              Good
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Clean audits</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">Backlogs</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-gray-900">2</p>
            <span className="bg-orange-100 text-orange-700 text-xs font-medium py-0.5 px-2 rounded-full">
              Attention
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Pending audits</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">Avg Closure Time</p>
          <p className="text-2xl font-bold text-gray-900">12 days</p>
          <p className="text-xs text-gray-400 mt-1">Average completion</p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
        <div className="flex-1 flex flex-col sm:flex-row gap-3 sm:gap-2 items-start sm:items-center w-full">
          <div className="relative w-full max-w-md">
            <Search
              size={18}
              className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500"
            />
            <Input
              className="pl-10 border-none bg-[#F3F3F5]"
              placeholder="Search audits..."
            />
          </div>

          <div className="flex gap-2 sm:gap-3 flex-wrap">
            <Button variant="outline" className="flex items-center gap-2">
              <Funnel size={18} /> Filters
            </Button>
            <Button variant="outline">Sort By</Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <Card className="w-full">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-100">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="p-3 text-left font-medium text-gray-700 whitespace-nowrap border-b border-gray-200"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>

              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="p-3 text-gray-700 whitespace-nowrap"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Audit History Dialog */}
      <AuditHistoryDialog
        open={!!historyAudit}
        onOpenChange={(open) => !open && setHistoryAudit(null)}
        traceabilityId={historyAudit?.id ?? ""}
      />
    </>
  );
}

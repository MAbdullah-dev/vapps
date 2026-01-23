"use client";

import { useState } from "react";
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
} from "lucide-react";
import CreateAuditDialog from "./CreateAuditDialog";

type Audit = {
  id: string;
  auditType: string;
  auditCriteria: string;
  clause: string;
  ncClassification: string;
  riskLevel: string;
  processArea: string;
  scopeMethodBoundaries: string;
  plannedDate: string;
  actualDate: string;
  dueDate: string;
  kpiScore: "red" | "yellow" | "grey";
  auditStatus: string;
};

const audits: Audit[] = [
  {
    id: "AUD/2025/S1/P1/FPA/NC1",
    auditType: "FPA",
    auditCriteria: "ISO 9001",
    clause: "4.2",
    ncClassification: "Major",
    riskLevel: "High",
    processArea: "P1 QMS Control",
    scopeMethodBoundaries: "On-Site Remote",
    plannedDate: "01-03-2025",
    actualDate: "11-09-2025",
    dueDate: "01-10-2025",
    kpiScore: "red",
    auditStatus: "Pending",
  },
  {
    id: "AUD/2025/S1/P1/FPA/NC2",
    auditType: "FPA",
    auditCriteria: "ISO 9001",
    clause: "5.2",
    ncClassification: "Minor",
    riskLevel: "Medium",
    processArea: "P3 QMS Control",
    scopeMethodBoundaries: "On-Site",
    plannedDate: "01-03-2025",
    actualDate: "—",
    dueDate: "01-10-2025",
    kpiScore: "yellow",
    auditStatus: "Pending",
  },
  {
    id: "AUD/2025/S1/P1/FPA/NC3",
    auditType: "FPA",
    auditCriteria: "ISO 9001",
    clause: "6.2",
    ncClassification: "Minor",
    riskLevel: "Low",
    processArea: "P3 QMS Control",
    scopeMethodBoundaries: "On-Site",
    plannedDate: "20-09-2025",
    actualDate: "18-09-2025",
    dueDate: "01-10-2025",
    kpiScore: "yellow",
    auditStatus: "Pending",
  },
  {
    id: "AUD/2025/S1/P1/FPA/NC4",
    auditType: "FPA",
    auditCriteria: "ISO 9001",
    clause: "9.2",
    ncClassification: "Minor",
    riskLevel: "Low",
    processArea: "P1 QMS Control",
    scopeMethodBoundaries: "On-Site",
    plannedDate: "20-08-2025",
    actualDate: "—",
    dueDate: "20-09-2025",
    kpiScore: "grey",
    auditStatus: "Fail",
  },
];

const getClassificationColor = (classification: string) => {
  if (classification === "Major") {
    return "bg-red-500 text-white";
  }
  return "bg-yellow-100 text-yellow-800";
};

const getRiskLevelColor = (riskLevel: string) => {
  if (riskLevel === "High") {
    return "bg-red-500 text-white";
  }
  if (riskLevel === "Medium") {
    return "bg-yellow-100 text-yellow-800";
  }
  return "bg-blue-100 text-blue-800";
};

const getStatusColor = (status: string) => {
  if (status === "Fail") {
    return "bg-red-100 text-red-600";
  }
  return "bg-yellow-100 text-yellow-800";
};

const getKPIColor = (score: string) => {
  if (score === "red") {
    return "bg-red-500";
  }
  if (score === "yellow") {
    return "bg-yellow-500";
  }
  return "bg-gray-400";
};

const columns: ColumnDef<Audit>[] = [
  {
    accessorKey: "id",
    header: "Audit Nonconformity Ref.",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.id}</span>
    ),
  },
  {
    accessorKey: "auditType",
    header: "Audit Type",
    cell: ({ row }) => (
      <span className="bg-gray-100 text-gray-600 py-1 px-2 rounded-full text-xs">
        {row.original.auditType}
      </span>
    ),
  },
  {
    accessorKey: "auditCriteria",
    header: "Audit Criteria",
  },
  {
    accessorKey: "clause",
    header: "Clause",
  },
  {
    accessorKey: "ncClassification",
    header: "NC Classification",
    cell: ({ row }) => (
      <span className={`${getClassificationColor(row.original.ncClassification)} py-1 px-2 rounded-full text-xs`}>
        {row.original.ncClassification}
      </span>
    ),
  },
  {
    accessorKey: "riskLevel",
    header: "Risk Level",
    cell: ({ row }) => (
      <span className={`${getRiskLevelColor(row.original.riskLevel)} py-1 px-2 rounded-full text-xs`}>
        {row.original.riskLevel}
      </span>
    ),
  },
  {
    accessorKey: "processArea",
    header: "Process/Area",
  },
  {
    accessorKey: "scopeMethodBoundaries",
    header: "Scope, Method & Boundaries",
  },
  {
    accessorKey: "plannedDate",
    header: "Planned Date",
  },
  {
    accessorKey: "actualDate",
    header: "Actual Date",
    cell: ({ row }) => (
      <span className={row.original.actualDate === "—" ? "text-gray-400" : ""}>
        {row.original.actualDate}
      </span>
    ),
  },
  {
    accessorKey: "dueDate",
    header: "Due Date (30 days)",
  },
  {
    accessorKey: "kpiScore",
    header: "KPI (Score)",
    cell: ({ row }) => (
      <div className={`${getKPIColor(row.original.kpiScore)} w-3 h-3 rounded-full`} />
    ),
  },
  {
    accessorKey: "auditStatus",
    header: "Audit Status",
    cell: ({ row }) => (
      <span className={`${getStatusColor(row.original.auditStatus)} py-1 px-2 rounded-full text-xs`}>
        {row.original.auditStatus}
      </span>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: () => (
      <EllipsisVertical className="cursor-pointer text-gray-500 hover:text-gray-700" size={18} />
    ),
  },
];

export default function AuditsContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
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
        <Button
          variant="dark"
          className="flex items-center gap-2"
          onClick={() => setDialogOpen(true)}
        >
          <Plus size={18} /> Create Audit
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

      {/* Create Audit Dialog */}
      <CreateAuditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}

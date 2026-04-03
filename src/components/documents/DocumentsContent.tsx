"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Archive,
  Cloud,
  Download,
  Eye,
  FileDown,
  FileSpreadsheet,
  FileText,
  HardDrive,
  MoreVertical,
  Pencil,
  Plus,
  Scissors,
  Search,
  Send,
  Server,
  Share2,
  Trash2,
  Upload,
} from "lucide-react";
import { getDashboardPath } from "@/lib/subdomain";
import { cn } from "@/lib/utils";

type MasterDocumentRow = {
  id: string;
  documentRef: string;
  natureOfDocument: string;
  title: string;
  type: string;
  site: string;
  process: string;
  standard: string;
  clause: string;
  subclause: string;
  docNumber: string;
  version: string;
  planDate: string;
  releaseDate: string;
  reviewDue: string;
  kpi: string;
  docStatus: "In-Progress" | "Success" | "Pending" | "Fail";
  docPosition: "Draft" | "Review Pending" | "Approval Pending" | "Active" | "Needs Review Again";
  workflowStatus: "draft" | "in_review" | "in_approval" | "approved";
};

type DocumentsApiRecord = {
  id: string;
  status: "draft" | "submitted";
  preview_doc_ref: string;
  form_data: Record<string, unknown> | null;
  wizard_data: Record<string, unknown> | null;
  lifecycle_status?: "active" | "obsolete";
  created_by_user_name: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
};

function normalizeDocNumberSeg(value: unknown): string | null {
  const m = /^D(\d+)$/i.exec(String(value ?? "").trim());
  return m ? `D${m[1]}` : null;
}

/** Finds D1, D12 in preview_doc_ref (path segment or embedded). */
function pickDocNumberFromRef(documentRef: string): string | null {
  const ref = documentRef.trim();
  if (!ref) return null;
  const slash = ref.match(/\/D(\d+)(?:\/|$)/i);
  if (slash) return `D${slash[1]}`;
  const word = ref.match(/\bD(\d+)\b/i);
  if (word) return `D${word[1]}`;
  for (const seg of ref.split("/").filter(Boolean)) {
    const m = /^D(\d+)$/i.exec(String(seg).trim());
    if (m) return `D${m[1]}`;
  }
  return null;
}

/** Prefer wizard + ref; assign sequential D# after max existing for rows with no D# (legacy paths). */
function buildDocNumberResolver(records: DocumentsApiRecord[]) {
  const explicit = (row: DocumentsApiRecord): string | null => {
    const wizard = (row.wizard_data ?? {}) as Record<string, unknown>;
    const ref = String(row.preview_doc_ref ?? "").trim();
    const w = normalizeDocNumberSeg(wizard.documentNumberSegment);
    if (w) return w;
    return pickDocNumberFromRef(ref);
  };
  let max = 0;
  for (const row of records) {
    const n = explicit(row);
    if (n) {
      const m = /^D(\d+)$/i.exec(n);
      if (m) max = Math.max(max, Number(m[1]));
    }
  }
  const missing = records
    .filter((r) => !explicit(r))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const map = new Map(missing.map((r, i) => [r.id, `D${max + i + 1}`]));
  return (row: DocumentsApiRecord) => explicit(row) ?? map.get(row.id) ?? "-";
}

const MASTER_DOCUMENT_LIST_MOCK: MasterDocumentRow[] = [
  {
    id: "mock-master-1",
    documentRef: "Doc/2025/S1/P1/P/D1/v1",
    natureOfDocument: "New Document",
    title: "Environment Policy",
    type: "P",
    site: "S1",
    process: "P1-Quality",
    standard: "14001",
    clause: "4.0 Context",
    subclause: "4.2 Interested Parties",
    docNumber: "D1",
    version: "v1",
    planDate: "05-09-2025",
    releaseDate: "-",
    reviewDue: "-",
    kpi: "Consistent",
    docStatus: "In-Progress",
    docPosition: "Draft",
    workflowStatus: "draft",
  },
  {
    id: "mock-master-2",
    documentRef: "Doc/2025/S1/P2/F/D6/v3",
    natureOfDocument: "Revision",
    title: "Production Schedule",
    type: "F",
    site: "S1",
    process: "P2-Manufacturing",
    standard: "9001",
    clause: "8.5 Production",
    subclause: "8.5 Planning",
    docNumber: "D6",
    version: "v3",
    planDate: "11-09-2025",
    releaseDate: "11-09-2025",
    reviewDue: "11-09-2026",
    kpi: "Consistent",
    docStatus: "Success",
    docPosition: "Active",
    workflowStatus: "approved",
  },
  {
    id: "mock-master-3",
    documentRef: "Doc/2025/S1/P1/F/D9/v2",
    natureOfDocument: "New Document",
    title: "Parts Inspection",
    type: "F",
    site: "S1",
    process: "P1-Quality",
    standard: "9001",
    clause: "8.0 Planning",
    subclause: "8.6 Objectives",
    docNumber: "D9",
    version: "v2",
    planDate: "15-09-2025",
    releaseDate: "15-09-2025",
    reviewDue: "-",
    kpi: "Pending",
    docStatus: "Pending",
    docPosition: "Draft",
    workflowStatus: "in_approval",
  },
  {
    id: "mock-master-4",
    documentRef: "Doc/2025/S1/P4/F/D11/v4",
    natureOfDocument: "Revision",
    title: "Supplier Evaluation",
    type: "F",
    site: "S1",
    process: "P5-Supply Chain",
    standard: "9001",
    clause: "8.0 Improvement",
    subclause: "8.6 Objectives",
    docNumber: "D11",
    version: "v4",
    planDate: "20-08-2025",
    releaseDate: "20-08-2025",
    reviewDue: "20-09-2025",
    kpi: "Inconsistent",
    docStatus: "Fail",
    docPosition: "Active",
    workflowStatus: "approved",
  },
];

type ObsoleteDocumentRow = {
  documentRef: string;
  title: string;
  type: "P" | "F" | "EXT";
  processOwner: string;
  standard: string;
  site: string;
  docNumber: string;
  version: string;
  obsoletedBy: string;
  obsoleteDate: string;
  replacedBy: string;
  archivedLocation: string;
};

type DocumentaryEvidenceRow = {
  documentRef: string;
  title: string;
  processOwner: string;
  batchLot: string;
  yearMonth: string;
  site: string;
  docNumber: string;
  version: string;
  captureBy: string;
  captureDate: string;
  verifyBy: string | null;
  verifyDate: string | null;
  kpi: "Consistent" | "Pending" | "Inconsistent";
  recordStatus: "Success" | "Pending" | "Fail";
  recordRank: "Verified" | "Captured" | "Archived";
};

const DOCUMENTARY_EVIDENCE_MOCK: DocumentaryEvidenceRow[] = [
  {
    documentRef: "Doc/2025/S1/P4/F/D5/v1",
    title: "Inspection Checklist",
    processOwner: "P4",
    batchLot: "001",
    yearMonth: "2025/09",
    site: "S1",
    docNumber: "D5",
    version: "v1",
    captureBy: "Mr. Ali",
    captureDate: "10-01-2025",
    verifyBy: "Ms. Noor",
    verifyDate: "12-01-2025",
    kpi: "Consistent",
    recordStatus: "Success",
    recordRank: "Verified",
  },
  {
    documentRef: "Doc/2025/S1/P2/F/D6/v3",
    title: "Production Schedule Form",
    processOwner: "P2",
    batchLot: "042",
    yearMonth: "2025/09",
    site: "S1",
    docNumber: "D6",
    version: "v3",
    captureBy: "Mr. Khan",
    captureDate: "05-02-2025",
    verifyBy: null,
    verifyDate: null,
    kpi: "Pending",
    recordStatus: "Pending",
    recordRank: "Captured",
  },
  {
    documentRef: "Doc/2025/S1/P1/F/D7/v1",
    title: "Calibration Record",
    processOwner: "P1",
    batchLot: "100",
    yearMonth: "2025/03",
    site: "S1",
    docNumber: "D7",
    version: "v1",
    captureBy: "Ms. Ayesha",
    captureDate: "18-03-2025",
    verifyBy: "Mr. Zaid",
    verifyDate: "20-03-2025",
    kpi: "Inconsistent",
    recordStatus: "Fail",
    recordRank: "Archived",
  },
];

type RecordsDisposalRow = {
  recordId: string;
  description: string;
  disposedBy: string;
  disposalDate: string;
  retentionPeriod: string;
  disposalMethod: "Delete" | "Shred";
  storageMedia: "Cloud" | "Physical" | "Local Server";
};

const RECORDS_DISPOSAL_LOG_MOCK: RecordsDisposalRow[] = [
  {
    recordId: "2020",
    description: "Training Records 2017",
    disposedBy: "Mr. abc",
    disposalDate: "12-12-2020",
    retentionPeriod: "3 Years",
    disposalMethod: "Delete",
    storageMedia: "Cloud",
  },
  {
    recordId: "2021",
    description: "QA Audit Files 2019",
    disposedBy: "Ms. Noor",
    disposalDate: "01-06-2021",
    retentionPeriod: "Lifetime",
    disposalMethod: "Shred",
    storageMedia: "Local Server",
  },
  {
    recordId: "2022",
    description: "Supplier Contracts",
    disposedBy: "Mr. Khan",
    disposalDate: "15-03-2022",
    retentionPeriod: "1 Year",
    disposalMethod: "Delete",
    storageMedia: "Physical",
  },
];

const OBSOLETE_DOCUMENT_REGISTER_MOCK: ObsoleteDocumentRow[] = [
  {
    documentRef: "Doc/2025/S1/P1/P/D1/v1",
    title: "Inventory Policy (Old)",
    type: "P",
    processOwner: "P1-Quality",
    standard: "ISO 14001",
    site: "S1",
    docNumber: "D1",
    version: "v1",
    obsoletedBy: "Mr. Abc",
    obsoleteDate: "01-12-2025",
    replacedBy: "Mr. Xyz",
    archivedLocation: "Cloud",
  },
  {
    documentRef: "Doc/2025/S1/P2/F/D6/v3",
    title: "Production Schedule (Superseded)",
    type: "F",
    processOwner: "P2-Manufacturing",
    standard: "ISO 9001",
    site: "S1",
    docNumber: "D6",
    version: "v3",
    obsoletedBy: "Mr. Def",
    obsoleteDate: "15-11-2025",
    replacedBy: "—",
    archivedLocation: "Local Server",
  },
  {
    documentRef: "Doc/2025/S1/P1/F/D9/v2",
    title: "Parts Inspection (Archive)",
    type: "F",
    processOwner: "P1-Quality",
    standard: "ISO 9001",
    site: "S1",
    docNumber: "D9",
    version: "v2",
    obsoletedBy: "Mr. Ghi",
    obsoleteDate: "03-10-2025",
    replacedBy: "Mr. Jkl",
    archivedLocation: "Cloud",
  },
];

function ObsoleteTypeBadge({ type }: { type: ObsoleteDocumentRow["type"] }) {
  const map: Record<ObsoleteDocumentRow["type"], string> = {
    P: "border-transparent bg-violet-100 text-violet-800 hover:bg-violet-100",
    F: "border-transparent bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
    EXT: "border-transparent bg-slate-100 text-slate-700 hover:bg-slate-100",
  };
  return (
    <Badge
      className={cn(
        "h-6 min-w-7 justify-center rounded-md px-2 text-xs font-semibold",
        map[type]
      )}
    >
      {type}
    </Badge>
  );
}

function ArchivedLocationBadge({ label }: { label: string }) {
  return (
    <Badge
      variant="outline"
      className="rounded-md border-[#E5E7EB] bg-[#F3F4F6] px-2.5 py-1 text-xs font-medium text-[#4B5563] hover:bg-[#F3F4F6]"
    >
      {label}
    </Badge>
  );
}

function ObsoleteRegisterColumnHead({
  title,
  hint,
  className,
  align = "left",
}: {
  title: string;
  hint?: string;
  className?: string;
  align?: "left" | "center";
}) {
  return (
    <TableHead
      className={cn(
        "align-top px-3 py-2.5 text-xs font-semibold text-foreground first:pl-4 last:pr-4",
        align === "center" && "text-center",
        className
      )}
    >
      <span
        className={cn(
          "block leading-tight",
          align === "center" && "mx-auto max-w-[15rem]"
        )}
      >
        {title}
      </span>
      {hint ? (
        <span
          className={cn(
            "mt-1 block max-w-[14rem] text-[10px] font-normal leading-snug text-muted-foreground",
            align === "center" && "mx-auto"
          )}
        >
          {hint}
        </span>
      ) : null}
    </TableHead>
  );
}

function EvidenceKpiText({ kpi }: { kpi: DocumentaryEvidenceRow["kpi"] }) {
  const map: Record<DocumentaryEvidenceRow["kpi"], string> = {
    Consistent: "text-[#16A34A]",
    Pending: "text-[#EA580C]",
    Inconsistent: "text-[#DC2626]",
  };
  return <span className={cn("text-sm font-medium", map[kpi])}>{kpi}</span>;
}

function EvidenceRecordStatusBadge({ status }: { status: DocumentaryEvidenceRow["recordStatus"] }) {
  const map: Record<DocumentaryEvidenceRow["recordStatus"], string> = {
    Success:
      "border-transparent bg-emerald-600 text-white hover:bg-emerald-600 shadow-none",
    Pending:
      "border-transparent bg-orange-500 text-white hover:bg-orange-500 shadow-none",
    Fail: "border-transparent bg-red-600 text-white hover:bg-red-600 shadow-none",
  };
  return (
    <Badge
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-semibold",
        map[status]
      )}
    >
      {status}
    </Badge>
  );
}

function RetentionPeriodBadge({ label }: { label: string }) {
  return (
    <Badge
      variant="outline"
      className="rounded-md border-[#E5E7EB] bg-[#F3F4F6] px-2.5 py-1 text-xs font-medium text-[#4B5563] hover:bg-[#F3F4F6]"
    >
      {label}
    </Badge>
  );
}

function DisposalMethodBadge({ method }: { method: RecordsDisposalRow["disposalMethod"] }) {
  if (method === "Delete") {
    return (
      <Badge className="gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 shadow-none hover:bg-red-50">
        <Trash2 className="size-3.5" aria-hidden />
        Delete
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 shadow-none hover:bg-slate-100">
      <Scissors className="size-3.5" aria-hidden />
      Shred
    </Badge>
  );
}

function StorageMediaCell({ media }: { media: RecordsDisposalRow["storageMedia"] }) {
  const map = {
    Cloud: {
      Icon: Cloud,
      text: "text-violet-600",
      label: "Cloud",
    },
    Physical: {
      Icon: HardDrive,
      text: "text-slate-600",
      label: "Physical",
    },
    "Local Server": {
      Icon: Server,
      text: "text-orange-600",
      label: "Local Server",
    },
  } as const;
  const { Icon, text, label } = map[media];
  return (
    <div className={cn("flex items-center gap-1.5 text-sm font-medium", text)}>
      <Icon className="size-4 shrink-0" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

function EvidenceRecordRankBadge({ rank }: { rank: DocumentaryEvidenceRow["recordRank"] }) {
  const map: Record<DocumentaryEvidenceRow["recordRank"], string> = {
    Verified:
      "border-transparent bg-emerald-600 text-white hover:bg-emerald-600 shadow-none",
    Captured:
      "border-transparent bg-amber-500 text-white hover:bg-amber-500 shadow-none",
    Archived:
      "border-transparent bg-slate-500 text-white hover:bg-slate-500 shadow-none",
  };
  return (
    <Badge
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-semibold",
        map[rank]
      )}
    >
      {rank}
    </Badge>
  );
}

function DocStatusBadge({ status }: { status: MasterDocumentRow["docStatus"] }) {
  const map: Record<MasterDocumentRow["docStatus"], string> = {
    "In-Progress": "bg-sky-50 text-sky-700 border border-sky-200",
    Success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    Pending: "bg-amber-50 text-amber-800 border border-amber-200",
    Fail: "bg-red-50 text-red-700 border border-red-200",
  };
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", map[status])}>
      {status}
    </span>
  );
}

function DocPositionBadge({ position }: { position: MasterDocumentRow["docPosition"] }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2.5 py-1 text-xs font-semibold text-white",
        position === "Draft"
          ? "bg-orange-500"
          : position === "Review Pending"
            ? "bg-amber-600"
            : position === "Approval Pending"
              ? "bg-blue-600"
              : position === "Needs Review Again"
                ? "bg-red-600"
            : "bg-neutral-700"
      )}
    >
      {position}
    </span>
  );
}

function MasterDocumentRowActionsMenu({
  editHref,
  viewHref,
  canEditDirectly,
  reviseUpdateHref,
  reviseTransferHref,
  workflowStatus,
}: {
  editHref: string;
  viewHref: string;
  canEditDirectly: boolean;
  reviseUpdateHref: string;
  reviseTransferHref: string;
  workflowStatus: MasterDocumentRow["workflowStatus"];
}) {
  const workflowStep =
    workflowStatus === "in_review" ? "2" : workflowStatus === "in_approval" ? "3" : "1";
  const workflowHref = `${editHref}&step=${workflowStep}`;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#6A7282] hover:bg-[#F3F4F6] hover:text-[#0A0A0A] data-[state=open]:bg-[#F3F4F6]"
          aria-label="Row actions"
        >
          <MoreVertical size={18} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[220px] rounded-xl border border-[#E5E7EB] bg-white p-2 shadow-lg"
      >
        <DropdownMenuItem asChild className="gap-2 cursor-pointer rounded-lg py-2 text-sm text-[#0A0A0A] focus:bg-[#F3F4F6]">
          <Link href={viewHref}>
            <Eye size={16} className="text-[#6A7282]" />
            View
          </Link>
        </DropdownMenuItem>
        {canEditDirectly ? (
          <DropdownMenuItem asChild className="gap-2 cursor-pointer rounded-lg py-2 text-sm text-[#0A0A0A] focus:bg-[#F3F4F6]">
            <Link href={editHref}>
              <Pencil size={16} className="text-[#6A7282]" />
              Edit
            </Link>
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-normal uppercase tracking-wide text-[#9CA3AF]">
              Revision Required
            </DropdownMenuLabel>
            <DropdownMenuItem asChild className="gap-2 cursor-pointer rounded-lg py-2 text-sm text-[#0A0A0A] focus:bg-[#F3F4F6]">
              <Link href={reviseUpdateHref}>
                <Pencil size={16} className="text-[#6A7282]" />
                Revise &amp; Update
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="gap-2 cursor-pointer rounded-lg py-2 text-sm text-[#0A0A0A] focus:bg-[#F3F4F6]">
              <Link href={reviseTransferHref}>
                <Pencil size={16} className="text-[#6A7282]" />
                Revise &amp; Transfer
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg py-2 text-sm text-[#2563EB] focus:bg-[#EFF6FF] focus:text-[#2563EB] [&_svg]:text-[#2563EB]">
          <Share2 size={16} />
          Share
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg py-2 text-sm text-[#6B7280] focus:bg-[#F9FAFB] focus:text-[#6B7280] [&_svg]:text-[#6B7280]">
          <FileDown size={16} />
          Download PDF
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg py-2 text-sm text-[#16A34A] focus:bg-[#F0FDF4] focus:text-[#16A34A] [&_svg]:text-[#16A34A]">
          <FileSpreadsheet size={16} />
          Download Excel
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-2 bg-[#E5E7EB]" />
        <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-normal uppercase tracking-wide text-[#9CA3AF]">
          Workflow
        </DropdownMenuLabel>
        <DropdownMenuItem
          asChild
          className="gap-2 cursor-pointer rounded-lg py-2 text-sm text-[#2563EB] focus:bg-[#EFF6FF] focus:text-[#2563EB] [&_svg]:text-[#2563EB]"
        >
          <Link href={workflowHref}>
            <Send size={16} />
            {workflowStatus === "in_review" ? "Submit for Approval" : "Submit for Review"}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ObsoleteDocumentRowActionsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Row actions"
        >
          <MoreVertical className="size-[18px]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[200px] rounded-xl border border-[#E5E7EB] bg-white p-2 shadow-lg"
      >
        <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg py-2 text-sm text-[#0A0A0A] focus:bg-[#F3F4F6] focus:text-[#0A0A0A]">
          <Eye size={16} className="text-[#0A0A0A]" />
          View
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg py-2 text-sm text-[#2563EB] focus:bg-[#EFF6FF] focus:text-[#2563EB] [&_svg]:text-[#2563EB]">
          <Share2 size={16} />
          Share
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg py-2 text-sm text-[#6B7280] focus:bg-[#F9FAFB] focus:text-[#6B7280] [&_svg]:text-[#6B7280]">
          <FileDown size={16} />
          Download PDF
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg py-2 text-sm text-[#16A34A] focus:bg-[#F0FDF4] focus:text-[#16A34A] [&_svg]:text-[#16A34A]">
          <FileSpreadsheet size={16} />
          Download Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DocumentaryEvidenceRowActionsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Row actions"
        >
          <MoreVertical className="size-[18px]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[220px] rounded-xl border border-[#E5E7EB] bg-white p-2 shadow-lg"
      >
        <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg py-2 text-sm text-[#0A0A0A] focus:bg-[#F3F4F6]">
          <Eye size={16} className="text-[#0A0A0A]" />
          View
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg py-2 text-sm text-[#0A0A0A] focus:bg-[#F3F4F6]">
          <Pencil size={16} className="text-[#0A0A0A]" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg py-2 text-sm text-[#6366F1] focus:bg-[#EEF2FF] focus:text-[#6366F1] [&_svg]:text-[#6366F1]">
          <Share2 size={16} />
          Share
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg py-2 text-sm text-[#6B7280] focus:bg-[#F9FAFB] focus:text-[#6B7280] [&_svg]:text-[#6B7280]">
          <FileDown size={16} />
          Download PDF
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg py-2 text-sm text-[#16A34A] focus:bg-[#F0FDF4] focus:text-[#16A34A] [&_svg]:text-[#16A34A]">
          <FileSpreadsheet size={16} />
          Download Excel
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-2 bg-[#E5E7EB]" />
        <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-normal uppercase tracking-wide text-[#9CA3AF]">
          Record lifecycle
        </DropdownMenuLabel>
        <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg py-2 text-sm text-[#6B7280] focus:bg-[#F9FAFB] focus:text-[#6B7280] [&_svg]:text-[#6B7280]">
          <Archive size={16} />
          Archive Record
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RecordsDisposalRowActionsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Row actions"
        >
          <MoreVertical className="size-[18px]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[220px] rounded-xl border border-[#E5E7EB] bg-white p-2 shadow-lg"
      >
        <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg py-2 text-sm text-[#0A0A0A] focus:bg-[#F3F4F6]">
          <Eye size={16} className="text-[#0A0A0A]" />
          View
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg py-2 text-sm text-[#2563EB] focus:bg-[#EFF6FF] focus:text-[#2563EB] [&_svg]:text-[#2563EB]">
          <Share2 size={16} />
          Share
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg py-2 text-sm text-[#6B7280] focus:bg-[#F9FAFB] focus:text-[#6B7280] [&_svg]:text-[#6B7280]">
          <FileDown size={16} />
          Download PDF
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg py-2 text-sm text-[#16A34A] focus:bg-[#F0FDF4] focus:text-[#16A34A] [&_svg]:text-[#16A34A]">
          <FileSpreadsheet size={16} />
          Download Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function DocumentsContent() {
  const params = useParams();
  const orgId = (params?.orgId as string) || "";
  const createDocumentHref = orgId ? getDashboardPath(orgId, "documents/create") : "#";
  const createDocumentBaseHref = orgId ? getDashboardPath(orgId, "documents/create") : "#";
  const documentaryEvidenceTemplatesHref = orgId
    ? getDashboardPath(orgId, "documents/documentary-evidence")
    : "#";
  const [selectedTable, setSelectedTable] = useState<string>("Master Document List");
  const [search, setSearch] = useState("");
  const [masterApiRows, setMasterApiRows] = useState<MasterDocumentRow[]>([]);
  const [obsoleteApiRows, setObsoleteApiRows] = useState<ObsoleteDocumentRow[]>([]);

  useEffect(() => {
    let ignore = false;
    async function loadDocuments() {
      if (!orgId) return;
      try {
        const [activeRes, obsoleteRes] = await Promise.all([
          fetch(`/api/organization/${orgId}/documents?lifecycle=active`, {
            credentials: "include",
          }),
          fetch(`/api/organization/${orgId}/documents?lifecycle=obsolete`, {
            credentials: "include",
          }),
        ]);
        const activeJson = activeRes.ok ? await activeRes.json() : { records: [] };
        const obsoleteJson = obsoleteRes.ok ? await obsoleteRes.json() : { records: [] };
        if (ignore) return;

        const records = Array.isArray(activeJson?.records)
          ? (activeJson.records as DocumentsApiRecord[])
          : [];
        const obsoleteRecords = Array.isArray(obsoleteJson?.records)
          ? (obsoleteJson.records as DocumentsApiRecord[])
          : [];

        const formatDate = (value: string | null | undefined): string => {
          if (!value) return "-";
          const d = new Date(value);
          if (Number.isNaN(d.getTime())) return "-";
          const dd = String(d.getDate()).padStart(2, "0");
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const yyyy = d.getFullYear();
          return `${dd}-${mm}-${yyyy}`;
        };

        const resolveMasterDocNumber = buildDocNumberResolver(records);
        const resolveObsoleteDocNumber = buildDocNumberResolver(obsoleteRecords);

        const pickVersion = (documentRef: string): string => {
          const parts = documentRef.split("/").filter(Boolean);
          if (parts.length < 1) return "-";
          return parts[parts.length - 1] ?? "-";
        };

        const mapped: MasterDocumentRow[] = records.map((row) => {
          const formData = (row.form_data ?? {}) as Record<string, unknown>;
          const wizard = (row.wizard_data ?? {}) as Record<string, unknown>;

          const documentRef = String(row.preview_doc_ref ?? "").trim() || "-";
          const actionType = String(wizard.actionType ?? "").toLowerCase();
          const natureOfDocument =
            actionType === "revise"
              ? "Revision"
              : actionType === "obsolete"
                ? "Obsolete"
                : "New Document";

          const standardRaw = String(formData.managementStandard ?? "").trim();
          const standard = standardRaw || "-";

          const reviewedAtRaw = String((row as { reviewed_at?: string | null }).reviewed_at ?? "").trim();
          const reviewedAtDate = reviewedAtRaw ? new Date(reviewedAtRaw) : null;
          const isValidReviewedAt = Boolean(reviewedAtDate && !Number.isNaN(reviewedAtDate.getTime()));
          const reviewDueDate = isValidReviewedAt
            ? new Date(
                reviewedAtDate!.getFullYear() + 1,
                reviewedAtDate!.getMonth(),
                reviewedAtDate!.getDate(),
                reviewedAtDate!.getHours(),
                reviewedAtDate!.getMinutes(),
                reviewedAtDate!.getSeconds(),
                reviewedAtDate!.getMilliseconds()
              )
            : null;
          const isReviewExpired = Boolean(reviewDueDate && Date.now() >= reviewDueDate.getTime());

          const workflowRaw = String((row as { workflow_status?: string }).workflow_status ?? "draft")
            .toLowerCase()
            .trim();
          const workflowStatus: MasterDocumentRow["workflowStatus"] =
            workflowRaw === "approved"
              ? "approved"
              : workflowRaw === "in_approval"
                ? "in_approval"
                : workflowRaw === "in_review"
                  ? "in_review"
                  : "draft";
          const status: MasterDocumentRow["docStatus"] =
            workflowStatus === "approved" && isReviewExpired
              ? "Pending"
              : workflowStatus === "approved"
              ? "Success"
              : workflowStatus === "in_approval"
                ? "Pending"
                : workflowStatus === "in_review"
                  ? "In-Progress"
                  : "In-Progress";
          const position: MasterDocumentRow["docPosition"] =
            workflowStatus === "approved" && isReviewExpired
              ? "Needs Review Again"
              : workflowStatus === "approved"
              ? "Active"
              : workflowStatus === "in_approval"
                ? "Approval Pending"
                : workflowStatus === "in_review"
                ? "Review Pending"
                : "Draft";
          return {
            id: row.id,
            documentRef,
            natureOfDocument,
            title: String(formData.title ?? "").trim() || "-",
            type: String(wizard.documentClassification ?? formData.docType ?? "").trim() || "-",
            site: String(formData.siteId ?? formData.site ?? "").trim() || "-",
            process: String(formData.processName ?? formData.processId ?? "").trim() || "-",
            standard,
            clause: String(formData.clause ?? "").trim() || "-",
            subclause: String(formData.subClause ?? "").trim() || "-",
            docNumber: resolveMasterDocNumber(row),
            version: pickVersion(documentRef),
            planDate: String(wizard.planDate ?? "").trim() ? formatDate(String(wizard.planDate)) : "-",
            releaseDate: row.status === "submitted" ? formatDate(row.updated_at || row.created_at) : "-",
            reviewDue: reviewDueDate ? formatDate(reviewDueDate.toISOString()) : "-",
            kpi: String(wizard.riskLevel ?? "Consistent").trim() || "Consistent",
            docStatus: status,
            docPosition: position,
            workflowStatus,
          };
        });
        const mappedObsolete: ObsoleteDocumentRow[] = obsoleteRecords.map((row) => {
          const formData = (row.form_data ?? {}) as Record<string, unknown>;
          const wizard = (row.wizard_data ?? {}) as Record<string, unknown>;
          const documentRef = String(row.preview_doc_ref ?? "").trim() || "-";
          const parts = documentRef.split("/").filter(Boolean);
          const docNumber = resolveObsoleteDocNumber(row);
          const version = parts.length >= 1 ? parts[parts.length - 1] ?? "-" : "-";
          const typeRaw = String(wizard.documentClassification ?? formData.docType ?? "P")
            .toUpperCase()
            .trim();
          const type: "P" | "F" | "EXT" =
            typeRaw === "EXT" ? "EXT" : typeRaw === "F" ? "F" : "P";
          return {
            documentRef,
            title: String(formData.title ?? "").trim() || "-",
            type,
            processOwner: String(formData.processName ?? formData.processId ?? "-"),
            standard: String(formData.managementStandard ?? "-"),
            site: String(formData.siteId ?? formData.site ?? "-"),
            docNumber,
            version,
            obsoletedBy: String(row.created_by_user_name ?? "-"),
            obsoleteDate: formatDate(row.updated_at || row.created_at),
            replacedBy: "-",
            archivedLocation: "Cloud",
          };
        });

        setMasterApiRows(mapped);
        setObsoleteApiRows(mappedObsolete);
      } catch {
        if (!ignore) {
          setMasterApiRows([]);
          setObsoleteApiRows([]);
        }
      }
    }

    void loadDocuments();
    return () => {
      ignore = true;
    };
  }, [orgId]);

  const masterDocumentsForTable = useMemo((): MasterDocumentRow[] => {
    switch (selectedTable) {
      case "Master Document List":
        return masterApiRows.length > 0 ? masterApiRows : MASTER_DOCUMENT_LIST_MOCK;
      case "Obsolete Document Register":
      case "Documentary Evidence":
      case "Records Disposal Log":
        return [];
      default:
        return masterApiRows.length > 0 ? masterApiRows : MASTER_DOCUMENT_LIST_MOCK;
    }
  }, [masterApiRows, selectedTable]);

  const filteredMaster = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return masterDocumentsForTable;
    return masterDocumentsForTable.filter((d) => {
      const haystack = [
        d.documentRef,
        d.natureOfDocument,
        d.title,
        d.type,
        d.site,
        d.process,
        d.standard,
        d.clause,
        d.subclause,
        d.docNumber,
        d.version,
        d.planDate,
        d.releaseDate,
        d.reviewDue,
        d.kpi,
        d.docStatus,
        d.docPosition,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [masterDocumentsForTable, search]);

  const filteredObsolete = useMemo(() => {
    if (selectedTable !== "Obsolete Document Register") return [];
    const q = search.trim().toLowerCase();
    const source = obsoleteApiRows.length > 0 ? obsoleteApiRows : OBSOLETE_DOCUMENT_REGISTER_MOCK;
    if (!q) return source;
    return source.filter((row) => {
      const haystack = [
        row.documentRef,
        row.title,
        row.type,
        row.processOwner,
        row.standard,
        row.site,
        row.docNumber,
        row.version,
        row.obsoletedBy,
        row.obsoleteDate,
        row.replacedBy,
        row.archivedLocation,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [selectedTable, search, obsoleteApiRows]);

  const filteredDocumentaryEvidence = useMemo(() => {
    if (selectedTable !== "Documentary Evidence") return [];
    const q = search.trim().toLowerCase();
    if (!q) return DOCUMENTARY_EVIDENCE_MOCK;
    return DOCUMENTARY_EVIDENCE_MOCK.filter((row) => {
      const haystack = [
        row.documentRef,
        row.title,
        row.processOwner,
        row.batchLot,
        row.yearMonth,
        row.site,
        row.docNumber,
        row.version,
        row.captureBy,
        row.captureDate,
        row.verifyBy ?? "",
        row.verifyDate ?? "",
        row.kpi,
        row.recordStatus,
        row.recordRank,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [selectedTable, search]);

  const filteredRecordsDisposal = useMemo(() => {
    if (selectedTable !== "Records Disposal Log") return [];
    const q = search.trim().toLowerCase();
    if (!q) return RECORDS_DISPOSAL_LOG_MOCK;
    return RECORDS_DISPOSAL_LOG_MOCK.filter((row) => {
      const haystack = [
        row.recordId,
        row.description,
        row.disposedBy,
        row.disposalDate,
        row.retentionPeriod,
        row.disposalMethod,
        row.storageMedia,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [selectedTable, search]);

  return (
    <div className="space-y-6">
      <Card className="py-4">
        <CardContent>
          {/* Workflow header (same concept as audit) */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FileText size={20} />
                <h1 className="text-xl sm:text-2xl font-semibold text-[#0A0A0A]">
                  Document Management Tables
                </h1>
              </div>
              <p className="text-sm text-[#9CA3AF] mt-1">
                View and manage documents across different categories
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                asChild
                className="flex items-center gap-2 bg-[#6366F1] hover:bg-[#6366F1]/90 text-white"
              >
                <Link href={documentaryEvidenceTemplatesHref}>
                  <FileText size={16} />
                  Documentary Evidence Records
                </Link>
              </Button>
              <Button asChild className="text-white flex items-center gap-2" variant="default">
                <Link href={createDocumentHref}>
                  <Plus size={16} />
                  Create Document
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Select table */}
      <Card className="py-4">
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="w-full sm:w-auto">
            <p className="text-xs text-[#6A7282] mb-2">Select Table</p>
            <Select value={selectedTable} onValueChange={setSelectedTable}>
              <SelectTrigger className="w-full sm:min-w-[340px] sm:max-w-[520px] border border-[#0000001A] rounded-xl bg-white px-3 py-2 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Master Document List">
                  Master Document List
                </SelectItem>
                <SelectItem value="Obsolete Document Register">
                  Obsolete Document Register
                </SelectItem>
                <SelectItem value="Documentary Evidence">
                  Documentary Evidence (F) - Completed Form/Template - Archive
                </SelectItem>
                <SelectItem value="Records Disposal Log">
                  Records Disposal Log (F) - Completed Form/Template
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main list */}
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[#0A0A0A]">
                {selectedTable === "Obsolete Document Register"
                  ? "Obsolete Document Register P/F"
                  : selectedTable === "Documentary Evidence"
                    ? "Documentary Evidence (F) - Completed Form/Template - Archive"
                    : selectedTable === "Records Disposal Log"
                      ? "Records Disposal Log (F) - Completed Form/Template"
                      : selectedTable}
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-[#6A7282]"
                />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 border-none bg-[#F3F3F5] w-[260px]"
                  placeholder={
                    selectedTable === "Documentary Evidence" ||
                      selectedTable === "Records Disposal Log"
                      ? "Fetch..."
                      : "Search..."
                  }
                />
              </div>

              <Button variant="outline" className="flex items-center gap-2">
                <Download size={16} />
                Download Excel Sheet
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-[#0000001A] overflow-x-auto">
            {selectedTable === "Master Document List" ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#FAFAFA] hover:bg-[#FAFAFA]">
                    <TableHead className="text-xs font-semibold text-[#0A0A0A] whitespace-nowrap">
                      Document Ref.
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-[#0A0A0A] whitespace-nowrap">
                      Nature of Document
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-[#0A0A0A] whitespace-nowrap">Title</TableHead>
                    <TableHead className="text-xs font-semibold text-[#0A0A0A] whitespace-nowrap">Type</TableHead>
                    <TableHead className="text-xs font-semibold text-[#0A0A0A] whitespace-nowrap">Site</TableHead>
                    <TableHead className="text-xs font-semibold text-[#0A0A0A] whitespace-nowrap">Process</TableHead>
                    <TableHead className="text-xs font-semibold text-[#0A0A0A] whitespace-nowrap">Standard</TableHead>
                    <TableHead className="text-xs font-semibold text-[#0A0A0A] whitespace-nowrap">Clause</TableHead>
                    <TableHead className="text-xs font-semibold text-[#0A0A0A] whitespace-nowrap">Subclause</TableHead>
                    <TableHead className="text-xs font-semibold text-[#0A0A0A] whitespace-nowrap">Doc#</TableHead>
                    <TableHead className="text-xs font-semibold text-[#0A0A0A] whitespace-nowrap">Version</TableHead>
                    <TableHead className="text-xs font-semibold text-[#0A0A0A] whitespace-nowrap">Plan Date</TableHead>
                    <TableHead className="text-xs font-semibold text-[#0A0A0A] whitespace-nowrap">Release Date</TableHead>
                    <TableHead className="text-xs font-semibold text-[#0A0A0A] min-w-[140px]">
                      Review Due (Lifecycle in Years)
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-[#0A0A0A] whitespace-nowrap">KPI</TableHead>
                    <TableHead className="text-xs font-semibold text-[#0A0A0A] whitespace-nowrap">Doc Status</TableHead>
                    <TableHead className="text-xs font-semibold text-[#0A0A0A] whitespace-nowrap">Doc Position</TableHead>
                    <TableHead className="text-xs font-semibold text-[#0A0A0A] w-[56px] text-center">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaster.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="text-sm font-medium text-[#0A0A0A] whitespace-nowrap">
                        {doc.documentRef}
                      </TableCell>
                      <TableCell className="text-sm text-[#0A0A0A]">{doc.natureOfDocument}</TableCell>
                      <TableCell className="text-sm text-[#0A0A0A] max-w-[200px]">{doc.title}</TableCell>
                      <TableCell>
                        <span className="text-xs font-semibold bg-[#ECEEF2] px-2 py-1 rounded-3xl text-[#0A0A0A]">
                          {doc.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{doc.site}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{doc.process}</TableCell>
                      <TableCell className="text-sm">{doc.standard}</TableCell>
                      <TableCell className="text-sm max-w-[120px]">{doc.clause}</TableCell>
                      <TableCell className="text-sm max-w-[160px]">{doc.subclause}</TableCell>
                      <TableCell className="text-sm font-semibold text-[#0A0A0A]">{doc.docNumber}</TableCell>
                      <TableCell className="text-sm font-semibold text-[#0A0A0A]">{doc.version}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{doc.planDate}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{doc.releaseDate}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{doc.reviewDue}</TableCell>
                      <TableCell className="text-sm">{doc.kpi}</TableCell>
                      <TableCell>
                        <DocStatusBadge status={doc.docStatus} />
                      </TableCell>
                      <TableCell>
                        <DocPositionBadge position={doc.docPosition} />
                      </TableCell>
                      <TableCell className="text-center">
                        <MasterDocumentRowActionsMenu
                          viewHref={`${createDocumentBaseHref}?recordId=${encodeURIComponent(doc.id)}&mode=view`}
                          editHref={`${createDocumentBaseHref}?recordId=${encodeURIComponent(doc.id)}&mode=edit`}
                          canEditDirectly={doc.workflowStatus !== "approved"}
                          reviseUpdateHref={`${createDocumentBaseHref}?recordId=${encodeURIComponent(doc.id)}&mode=edit&revisionType=update`}
                          reviseTransferHref={`${createDocumentBaseHref}?recordId=${encodeURIComponent(doc.id)}&mode=edit&revisionType=transfer`}
                          workflowStatus={doc.workflowStatus}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : selectedTable === "Obsolete Document Register" ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border bg-muted/50 hover:bg-muted/50">
                    <ObsoleteRegisterColumnHead
                      title="Document Ref."
                      hint="(Doc/Year/Site/Process/Type/Doc#/Version)"
                    />
                    <ObsoleteRegisterColumnHead title="Title" />
                    <ObsoleteRegisterColumnHead title="Type" hint="(P / F / EXT)" />
                    <ObsoleteRegisterColumnHead
                      title="Process Owner"
                      hint="(P1=Quality, P2=Manufacturing...)"
                    />
                    <ObsoleteRegisterColumnHead title="Standard" />
                    <ObsoleteRegisterColumnHead title="Site" />
                    <ObsoleteRegisterColumnHead title="Doc#" />
                    <ObsoleteRegisterColumnHead title="Version" />
                    <ObsoleteRegisterColumnHead title="Obsoleted By" />
                    <ObsoleteRegisterColumnHead title="Obsolete Date" />
                    <ObsoleteRegisterColumnHead title="Replaced By" hint="(If Any)" />
                    <ObsoleteRegisterColumnHead title="Archived Location" />
                    <TableHead className="w-14 px-3 py-2.5 text-center text-xs font-semibold text-foreground first:pl-4 last:pr-4">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredObsolete.map((row) => (
                    <TableRow
                      key={row.documentRef}
                      className="border-b border-border bg-background hover:bg-muted/30"
                    >
                      <TableCell className="px-3 py-2.5 pl-4 text-sm font-medium text-foreground whitespace-nowrap">
                        {row.documentRef}
                      </TableCell>
                      <TableCell className="max-w-[14rem] px-3 py-2.5 text-sm text-foreground whitespace-normal">
                        {row.title}
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <ObsoleteTypeBadge type={row.type} />
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-sm whitespace-nowrap text-foreground">
                        {row.processOwner}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-sm text-foreground">{row.standard}</TableCell>
                      <TableCell className="px-3 py-2.5 text-sm text-foreground">{row.site}</TableCell>
                      <TableCell className="px-3 py-2.5 text-sm font-bold text-foreground">{row.docNumber}</TableCell>
                      <TableCell className="px-3 py-2.5 text-sm text-foreground">{row.version}</TableCell>
                      <TableCell className="px-3 py-2.5 text-sm text-foreground">{row.obsoletedBy}</TableCell>
                      <TableCell className="px-3 py-2.5 text-sm whitespace-nowrap text-foreground">
                        {row.obsoleteDate}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-sm text-foreground">{row.replacedBy}</TableCell>
                      <TableCell className="px-3 py-2.5">
                        <ArchivedLocationBadge label={row.archivedLocation} />
                      </TableCell>
                      <TableCell className="px-3 py-2.5 pr-4 text-center">
                        <ObsoleteDocumentRowActionsMenu />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : selectedTable === "Documentary Evidence" ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border bg-muted/50 hover:bg-muted/50">
                    <ObsoleteRegisterColumnHead
                      title="Document Ref."
                      hint="(Doc/Year/Site/Process/Type/Doc#/Version)"
                    />
                    <ObsoleteRegisterColumnHead title="Title" />
                    <ObsoleteRegisterColumnHead
                      title="Process Owner"
                      hint="(P1=Quality, P2=Manufacturing...)"
                    />
                    <ObsoleteRegisterColumnHead title="Batch/Lot#" />
                    <ObsoleteRegisterColumnHead title="Year/Month" />
                    <ObsoleteRegisterColumnHead title="Site" />
                    <ObsoleteRegisterColumnHead title="Doc#" />
                    <ObsoleteRegisterColumnHead title="Version" />
                    <ObsoleteRegisterColumnHead title="Capture By" />
                    <ObsoleteRegisterColumnHead title="Capture Date" />
                    <ObsoleteRegisterColumnHead title="Verify By" />
                    <ObsoleteRegisterColumnHead title="Verify Date" />
                    <ObsoleteRegisterColumnHead
                      align="center"
                      title="KPI"
                      hint="<30d Green · >30d Yellow · >40d Red"
                    />
                    <ObsoleteRegisterColumnHead
                      align="center"
                      title="Record Status"
                      hint="Success / Pending / Fail"
                    />
                    <ObsoleteRegisterColumnHead
                      align="center"
                      title="Record Rank"
                      hint="Verified / Captured / Archived"
                    />
                    <ObsoleteRegisterColumnHead
                      align="center"
                      title="Actions"
                      hint="(View | Edit | Share | Download)"
                    />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocumentaryEvidence.map((row) => (
                    <TableRow
                      key={row.documentRef}
                      className="border-b border-border bg-background hover:bg-muted/30"
                    >
                      <TableCell className="px-3 py-2.5 pl-4 text-sm font-medium text-foreground whitespace-nowrap">
                        {row.documentRef}
                      </TableCell>
                      <TableCell className="max-w-[12rem] px-3 py-2.5 text-sm text-foreground whitespace-normal">
                        {row.title}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-sm text-foreground">{row.processOwner}</TableCell>
                      <TableCell className="px-3 py-2.5 text-sm tabular-nums text-foreground">
                        {row.batchLot}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-sm whitespace-nowrap text-foreground">
                        {row.yearMonth}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-sm text-foreground">{row.site}</TableCell>
                      <TableCell className="px-3 py-2.5 text-sm font-bold text-foreground">{row.docNumber}</TableCell>
                      <TableCell className="px-3 py-2.5 text-sm text-foreground">{row.version}</TableCell>
                      <TableCell className="px-3 py-2.5 text-sm text-foreground">{row.captureBy}</TableCell>
                      <TableCell className="px-3 py-2.5 text-sm whitespace-nowrap text-foreground">
                        {row.captureDate}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-sm text-muted-foreground">
                        {row.verifyBy ?? "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-sm whitespace-nowrap text-muted-foreground">
                        {row.verifyDate ?? "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-center">
                        <EvidenceKpiText kpi={row.kpi} />
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-center">
                        <div className="flex justify-center">
                          <EvidenceRecordStatusBadge status={row.recordStatus} />
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-center">
                        <div className="flex justify-center">
                          <EvidenceRecordRankBadge rank={row.recordRank} />
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2.5 pr-4 text-center">
                        <div className="flex justify-center">
                          <DocumentaryEvidenceRowActionsMenu />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : selectedTable === "Records Disposal Log" ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border bg-muted/50 hover:bg-muted/50">
                    <ObsoleteRegisterColumnHead title="Record ID" />
                    <ObsoleteRegisterColumnHead title="Description" />
                    <ObsoleteRegisterColumnHead title="Disposed By" />
                    <ObsoleteRegisterColumnHead title="Disposal Date" />
                    <ObsoleteRegisterColumnHead
                      title="Retention Period"
                      hint="(1Y / 2Y / 3Y / Legal / Lifetime)"
                    />
                    <ObsoleteRegisterColumnHead title="Disposal Method" hint="(Delete / Shred)" />
                    <ObsoleteRegisterColumnHead
                      title="Storage Media"
                      hint="(Cloud / Physical / Local Server)"
                    />
                    <ObsoleteRegisterColumnHead
                      align="center"
                      title="Actions"
                      hint="(View / Share / Download)"
                    />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecordsDisposal.map((row) => (
                    <TableRow
                      key={row.recordId + row.disposalDate}
                      className="border-b border-border bg-background hover:bg-muted/30"
                    >
                      <TableCell className="px-3 py-2.5 pl-4 text-sm font-bold text-foreground tabular-nums">
                        {row.recordId}
                      </TableCell>
                      <TableCell className="max-w-[14rem] px-3 py-2.5 text-sm text-foreground whitespace-normal">
                        {row.description}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-sm text-foreground">{row.disposedBy}</TableCell>
                      <TableCell className="px-3 py-2.5 text-sm whitespace-nowrap text-foreground">
                        {row.disposalDate}
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <RetentionPeriodBadge label={row.retentionPeriod} />
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <DisposalMethodBadge method={row.disposalMethod} />
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <StorageMediaCell media={row.storageMedia} />
                      </TableCell>
                      <TableCell className="px-3 py-2.5 pr-4 text-center">
                        <div className="flex justify-center">
                          <RecordsDisposalRowActionsMenu />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Ref.</TableHead>
                    <TableHead>Nature of Document</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Process</TableHead>
                    <TableHead>Standard</TableHead>
                    <TableHead>Clause</TableHead>
                    <TableHead>Subclause</TableHead>
                    <TableHead>Doc#</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Plan Date</TableHead>
                    <TableHead>Release Date</TableHead>
                    <TableHead>Review Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaster.map((doc) => (
                    <TableRow key={doc.documentRef}>
                      <TableCell className="font-medium text-[#0A0A0A]">{doc.documentRef}</TableCell>
                      <TableCell>{doc.natureOfDocument}</TableCell>
                      <TableCell>{doc.title}</TableCell>
                      <TableCell>
                        <span className="text-xs font-semibold bg-[#ECEEF2] px-2 py-1 rounded-3xl">
                          {doc.type}
                        </span>
                      </TableCell>
                      <TableCell>{doc.site}</TableCell>
                      <TableCell>{doc.process}</TableCell>
                      <TableCell>{doc.standard}</TableCell>
                      <TableCell>{doc.clause}</TableCell>
                      <TableCell>{doc.subclause}</TableCell>
                      <TableCell className="font-semibold">{doc.docNumber}</TableCell>
                      <TableCell className="font-semibold">{doc.version}</TableCell>
                      <TableCell>{doc.planDate}</TableCell>
                      <TableCell>{doc.releaseDate}</TableCell>
                      <TableCell>{doc.reviewDue}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Action strip (purely visual until backend exists) */}
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Button variant="outline" className="flex items-center gap-2">
              <Upload size={16} />
              Upload
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedTable === "Records Disposal Log" ? (
        <Card>
          <CardContent className="space-y-3 py-4">
            <h2 className="text-base font-semibold text-foreground">KPI Status Logic</h2>
            <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="size-3 shrink-0 rounded-sm bg-emerald-500" aria-hidden />
                <span>Success ≤30 days → Green (Consistent)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-3 shrink-0 rounded-sm bg-amber-400" aria-hidden />
                <span>In-Progress {'<'}30 days → Yellow</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-3 shrink-0 rounded-sm bg-red-500" aria-hidden />
                <span>Pending {'>'}30 days → Red</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-3 shrink-0 rounded-full bg-red-600" aria-hidden />
                <span>Fail {'>'}40 days → Red (Inconsistent)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Document Classification */}
      <Card>
        <CardContent className="space-y-4">
          <h2 className="text-base font-semibold text-[#0A0A0A]">
            Document Classification
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-[#0000001A] p-4">
              <h3 className="font-semibold text-sm mb-3">
                Category 1 - Maintained Documents <span className="text-[#22B323]">(Type P)</span>
              </h3>
              <div className="text-sm text-[#6A7282] space-y-1">
                <div>Policy</div>
                <div>Procedure</div>
                <div>SOP</div>
                <div>Work Instruction</div>
                <div>
                  <span className="font-medium text-[#0A0A0A]">Lifecycle:</span> Draft -&gt; Create -&gt; Review -&gt; Approve -&gt; Obsolete
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#0000001A] p-4">
              <h3 className="font-semibold text-sm mb-3">
                Category 2 - Retained Records <span className="text-[#0EA5E9]">(Type F)</span>
              </h3>
              <div className="text-sm text-[#6A7282] space-y-1">
                <div>Templates</div>
                <div>Forms</div>
                <div>Checklists</div>
                <div>
                  <span className="font-medium text-[#0A0A0A]">Lifecycle:</span>{" "}
                  Draft + Capture -&gt; Verify -&gt; Archive -&gt; Dispose
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


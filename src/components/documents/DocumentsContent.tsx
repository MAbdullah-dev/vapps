"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import jsPDF from "jspdf";
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
import { toast } from "sonner";

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
  createdByName?: string;
  processOwnerName?: string;
  approverName?: string;
  mainContent?: string;
};

type DocumentsApiRecord = {
  id: string;
  status: "draft" | "submitted";
  preview_doc_ref: string;
  form_data: Record<string, unknown> | null;
  wizard_data: Record<string, unknown> | null;
  workflow_status?: "draft" | "in_review" | "in_approval" | "approved";
  lifecycle_status?: "active" | "obsolete";
  created_by_user_name: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
};

function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 150);
}

function escapeHtmlCell(v: unknown): string {
  const s = String(v ?? "");
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Excel opens this HTML table as a worksheet (same pattern as per-row Excel export in this file). */
function downloadExcelTable(filename: string, headers: string[], rows: unknown[][]): void {
  const thead = `<tr>${headers.map((h) => `<th>${escapeHtmlCell(h)}</th>`).join("")}</tr>`;
  const tbody = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtmlCell(cell)}</td>`).join("")}</tr>`)
    .join("");
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body>
<table border="1" cellspacing="0" cellpadding="4">${thead}${tbody}</table>
</body>
</html>`;
  downloadTextFile(filename, html, "application/vnd.ms-excel;charset=utf-8");
}

/**
 * execCommand copy must run from a real click on a focusable control. Radix `onSelect` on
 * menu items often runs after focus moves, which makes this return false — use a native
 * `<button onClick>` + `modal={false}` on the menu root instead.
 */
function copyTextToClipboardSync(text: string): boolean {
  if (typeof document === "undefined" || !text) return false;
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    ta.style.fontSize = "12pt";
    ta.style.contain = "strict";
    document.body.appendChild(ta);
    ta.focus({ preventScroll: true });
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function copyShareUrlToClipboard(absoluteUrl: string): void {
  const showManualFallback = () => {
    toast.message("Copy this link", {
      description: absoluteUrl,
      duration: 25_000,
    });
  };

  if (copyTextToClipboardSync(absoluteUrl)) {
    toast.success("Link copied to clipboard.");
    return;
  }
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText && window.isSecureContext) {
    void navigator.clipboard.writeText(absoluteUrl).then(
      () => toast.success("Link copied to clipboard."),
      showManualFallback
    );
    return;
  }
  showManualFallback();
}

function sanitizeFilePart(value: string): string {
  return value.replace(/[^\w.-]+/g, "_").slice(0, 80) || "document";
}

function pTypeDocument(docType: string): boolean {
  return String(docType ?? "").trim().toUpperCase() === "P";
}

function htmlToPlain(value: string): string {
  const s = String(value ?? "");
  if (!s.trim()) return "";
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .split("\n")
    .map((x) => x.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

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

type ObsoleteDocumentRow = {
  id: string;
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

type RecordsDisposalRow = {
  recordId: string;
  description: string;
  disposedBy: string;
  disposalDate: string;
  retentionPeriod: string;
  disposalMethod: "Delete" | "Shred";
  storageMedia: "Cloud" | "Physical" | "Local Server";
};

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
  row,
  editHref,
  viewHref,
  canEditDirectly,
  reviseUpdateHref,
  reviseTransferHref,
  workflowStatus,
  onShare,
  onDownloadPdf,
  onDownloadExcel,
}: {
  row: MasterDocumentRow;
  editHref: string;
  viewHref: string;
  canEditDirectly: boolean;
  reviseUpdateHref: string;
  reviseTransferHref: string;
  workflowStatus: MasterDocumentRow["workflowStatus"];
  onShare: (row: MasterDocumentRow, viewHref: string) => void | Promise<void>;
  onDownloadPdf: (row: MasterDocumentRow) => void;
  onDownloadExcel: (row: MasterDocumentRow) => void;
}) {
  const workflowStep =
    workflowStatus === "in_review"
      ? "2"
      : workflowStatus === "in_approval"
        ? "3"
        : workflowStatus === "approved"
          ? "2"
          : "1";
  const workflowHref = `${editHref}&step=${workflowStep}`;
  const workflowLabel =
    workflowStatus === "in_review"
      ? "Submit for Approval"
      : workflowStatus === "in_approval"
        ? "Open Approval"
        : "Submit for Review";
  return (
    <DropdownMenu modal={false}>
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
        <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
          <button
            type="button"
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-[#2563EB] outline-none focus:bg-[#EFF6FF] focus:text-[#2563EB] [&_svg]:text-[#2563EB]"
            onClick={() => {
              void onShare(row, viewHref);
            }}
          >
            <Share2 size={16} />
            Share
          </button>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2 cursor-pointer rounded-lg py-2 text-sm text-[#6B7280] focus:bg-[#F9FAFB] focus:text-[#6B7280] [&_svg]:text-[#6B7280]"
          onSelect={() => onDownloadPdf(row)}
        >
          <FileDown size={16} />
          Download PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2 cursor-pointer rounded-lg py-2 text-sm text-[#16A34A] focus:bg-[#F0FDF4] focus:text-[#16A34A] [&_svg]:text-[#16A34A]"
          onSelect={() => onDownloadExcel(row)}
        >
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
            {workflowLabel}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ObsoleteDocumentRowActionsMenu({ onShare }: { onShare: () => void }) {
  return (
    <DropdownMenu modal={false}>
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
        <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
          <button
            type="button"
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-[#2563EB] outline-none focus:bg-[#EFF6FF] focus:text-[#2563EB] [&_svg]:text-[#2563EB]"
            onClick={() => onShare()}
          >
            <Share2 size={16} />
            Share
          </button>
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
    <DropdownMenu modal={false}>
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
    <DropdownMenu modal={false}>
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
  const [documentsLoaded, setDocumentsLoaded] = useState(() => !orgId);
  const [organizationName, setOrganizationName] = useState("Company Name");

  type EvidenceRecordRow = {
    id: string;
    template_record_id: string;
    template_preview_ref: string;
    workflow_status: string;
    capture_data: Record<string, unknown>;
    verify_archive_data: Record<string, unknown>;
    designated_verifier_user_id: string;
    designated_verifier_name: string;
    support_user_id: string;
    support_user_name: string;
    created_at: string;
    updated_at: string;
  };
  const [evidenceRows, setEvidenceRows] = useState<EvidenceRecordRow[]>([]);
  const [evidenceLoaded, setEvidenceLoaded] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function loadDocuments() {
      if (!orgId) {
        setMasterApiRows([]);
        setObsoleteApiRows([]);
        setDocumentsLoaded(true);
        return;
      }
      setDocumentsLoaded(false);
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
            createdByName: String(row.created_by_user_name ?? "").trim() || "-",
            processOwnerName: String(formData.processOwner ?? "").trim() || "-",
            approverName: String(formData.approverName ?? "").trim() || "-",
            mainContent:
              String(wizard.documentEditorContent ?? "").trim() ||
              String(formData.description ?? "").trim() ||
              "",
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
            id: row.id,
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
      } finally {
        if (!ignore) setDocumentsLoaded(true);
      }
    }

    void loadDocuments();
    return () => {
      ignore = true;
    };
  }, [orgId]);

  useEffect(() => {
    let ignore = false;
    async function loadEvidence() {
      if (!orgId || (selectedTable !== "Documentary Evidence" && selectedTable !== "Records Disposal Log")) {
        return;
      }
      setEvidenceLoaded(false);
      try {
        const res = await fetch(`/api/organization/${orgId}/documentary-evidence-records`, {
          credentials: "include",
        });
        const j = (await res.json().catch(() => ({}))) as { records?: EvidenceRecordRow[] };
        if (!ignore) {
          const rows = res.ok && Array.isArray(j.records) ? j.records : [];
          setEvidenceRows(rows.filter((r) => {
            const ws = String(r.workflow_status ?? "").trim();
            return ws === "capture_submitted" || ws === "completed";
          }));
        }
      } catch {
        if (!ignore) setEvidenceRows([]);
      } finally {
        if (!ignore) setEvidenceLoaded(true);
      }
    }
    void loadEvidence();
    return () => {
      ignore = true;
    };
  }, [orgId, selectedTable]);

  useEffect(() => {
    let ignore = false;
    async function loadOrgInfo() {
      if (!orgId) {
        if (!ignore) setOrganizationName("Company Name");
        return;
      }
      try {
        const res = await fetch(`/api/organization/${orgId}/organization-info`, { credentials: "include" });
        const j = res.ok ? await res.json() : {};
        if (ignore) return;
        const oi = (j?.organizationInfo && typeof j.organizationInfo === "object")
          ? (j.organizationInfo as Record<string, unknown>)
          : {};
        const orgNm = String(oi.name ?? oi.organizationName ?? oi.companyName ?? "").trim();
        setOrganizationName(orgNm || "Company Name");
      } catch {
        if (!ignore) setOrganizationName("Company Name");
      }
    }
    void loadOrgInfo();
    return () => {
      ignore = true;
    };
  }, [orgId]);

  const evidenceCapturedOnly = useMemo(
    () => evidenceRows.filter((r) => String(r.workflow_status ?? "").trim() === "capture_submitted"),
    [evidenceRows]
  );

  const evidenceCompletedOnly = useMemo(
    () => evidenceRows.filter((r) => String(r.workflow_status ?? "").trim() === "completed"),
    [evidenceRows]
  );

  const filteredEvidence = useMemo(() => {
    if (selectedTable !== "Documentary Evidence") return [];
    const source = evidenceCapturedOnly;
    const q = search.trim().toLowerCase();
    if (!q) return source;
    return source.filter((row) => {
      const cd = row.capture_data ?? {};
      const haystack = [
        row.template_preview_ref,
        String(cd.templateRef ?? ""),
        String(cd.capturedData ?? ""),
        String(cd.shift ?? ""),
        String(cd.lotBatchSerial ?? ""),
        row.designated_verifier_name,
        row.support_user_name,
        row.workflow_status,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [selectedTable, search, evidenceCapturedOnly]);

  const filteredDisposal = useMemo(() => {
    if (selectedTable !== "Records Disposal Log") return [];
    const source = evidenceCompletedOnly;
    const q = search.trim().toLowerCase();
    if (!q) return source;
    return source.filter((row) => {
      const cd = row.capture_data ?? {};
      const va = row.verify_archive_data ?? {};
      const haystack = [
        row.template_preview_ref,
        String(cd.templateRef ?? ""),
        String(cd.capturedData ?? ""),
        String(cd.lotBatchSerial ?? ""),
        row.designated_verifier_name,
        row.support_user_name,
        String(va.archiveLocation ?? ""),
        String(va.retentionPeriod ?? ""),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [selectedTable, search, evidenceCompletedOnly]);

  const masterDocumentsForTable = useMemo((): MasterDocumentRow[] => {
    switch (selectedTable) {
      case "Master Document List":
        return masterApiRows;
      case "Obsolete Document Register":
      case "Documentary Evidence":
      case "Records Disposal Log":
        return [];
      default:
        return masterApiRows;
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
    const source = obsoleteApiRows;
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

  const downloadMasterRowPdf = (docRow: MasterDocumentRow) => {
    try {
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const isP = pTypeDocument(docRow.type);
      const ref = docRow.documentRef || "-";
      const title = docRow.title || "-";
      const site = docRow.site || "[sys]";
      const process = docRow.process || "[sys]";
      const standard = docRow.standard || "[sys]";
      const clause = docRow.clause || "[sys]";
      const subClause = docRow.subclause || "[sys]";
      const createdBy = String(docRow.createdByName ?? "").trim() || "—";
      const reviewedBy = String(docRow.processOwnerName ?? "").trim() || "—";
      const approvedBy = String(docRow.approverName ?? "").trim() || "—";
      const createdDate = docRow.planDate !== "-" ? docRow.planDate : docRow.releaseDate;
      const reviewedDate = docRow.workflowStatus === "draft" ? "-" : (docRow.releaseDate !== "-" ? docRow.releaseDate : "-");
      const approvedDate =
        docRow.workflowStatus === "approved" ? (docRow.releaseDate !== "-" ? docRow.releaseDate : "-") : "-";
      const captureBy = createdBy;
      const verifyBy = docRow.workflowStatus === "approved" ? approvedBy : reviewedBy;
      const verifyDate = docRow.workflowStatus === "approved" ? approvedDate : reviewedDate;
      const commentsText = `Workflow: ${docRow.docPosition} (${docRow.docStatus})`;
      const bodyText = htmlToPlain(docRow.mainContent ?? "") || title;

      // Header strip
      pdf.setFillColor(245, 245, 245);
      pdf.rect(7, 6, 196, 18, "F");
      pdf.setDrawColor(180);
      pdf.setLineWidth(0.3);
      pdf.rect(7, 6, 196, 18);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      if (isP) {
        pdf.setTextColor(109, 40, 217); // violet
      } else {
        pdf.setTextColor(234, 88, 12); // orange
      }
      pdf.text(organizationName, 8, 12.5);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      pdf.setTextColor(17, 24, 39);
      pdf.text(`Ref# ${ref}`, 201, 12.5, { align: "right" });

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(0);
      pdf.text(
        isP ? "Policy/Procedure/SOP Title:" : "Form/Blank Template Title:",
        8,
        19.5
      );
      pdf.text(title, isP ? 62 : 47, 19.5);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8.5);
      pdf.text(
        `Standard: ${standard}   |   Clause: ${clause}   |   Subclause: ${subClause}`,
        201,
        19.5,
        { align: "right" }
      );

      if (!isP) {
        pdf.setDrawColor(160);
        pdf.line(7, 24.5, 203, 24.5);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(31, 41, 55);
        pdf.text(
          `Lot/Batch/Serial# ${docRow.docNumber || "[sys]"} | Std Clause Ref# ${clause} | Shift: ${process} | Records Archive: ${docRow.releaseDate || "Year / Month"} | System Date: ${docRow.releaseDate || "dd-mm-yy"} | Time: 00-00`,
          8,
          28
        );
      }

      // Body area
      pdf.setDrawColor(190);
      pdf.setLineWidth(0.3);
      pdf.rect(7, 30, 196, 240);
      const contentLines = pdf.splitTextToSize(bodyText, 160) as string[];
      const trimmedLines = contentLines.slice(0, 18);
      const blockHeight = Math.max(trimmedLines.length * 6, 14);
      const startY = 150 - blockHeight / 2;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10.5);
      if (isP) {
        pdf.setTextColor(14, 165, 233);
      } else {
        pdf.setTextColor(234, 88, 12);
      }
      pdf.text(trimmedLines, 104, startY, { align: "center" });

      // Footer lane
      pdf.setFillColor(245, 245, 245);
      pdf.rect(7, 271, 196, 13, "F");
      pdf.setDrawColor(180);
      pdf.rect(7, 271, 196, 13);

      const box = (x: number, y: number) => {
        pdf.setLineWidth(0.25);
        pdf.rect(x, y, 3.2, 3.2);
      };
      const arrow = "→";

      pdf.setTextColor(0);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      if (isP) {
        box(9, 279.3);
        pdf.text(`Created By: ${createdBy}   ID#${docRow.docNumber || "00"}   Date: ${createdDate || "-"}`, 13.3, 282.1);
        pdf.text(arrow, 64, 282.1);
        box(70, 279.3);
        pdf.text(`Reviewed By: ${reviewedBy}   ID#${docRow.docNumber || "00"}   Date: ${reviewedDate}`, 74.3, 282.1);
        pdf.text(arrow, 126, 282.1);
        box(134, 279.3);
        pdf.text(`Approved By: ${approvedBy}   ID#${docRow.docNumber || "00"}   Date: ${approvedDate}`, 138.3, 282.1);
      } else {
        box(9, 279.3);
        pdf.text(`Capture By: ${captureBy}   ID#${docRow.docNumber || "00"}   Date: ${createdDate || "-"}`, 13.3, 282.1);
        pdf.text(arrow, 100, 282.1);
        box(126, 279.3);
        pdf.text(`Verified By: ${verifyBy}   ID#${docRow.docNumber || "00"}   Date: ${verifyDate || "-"}`, 130.3, 282.1);

        box(9, 283.6);
        pdf.setFont("helvetica", "bold");
        pdf.text("DISCARD", 13.3, 286.1);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Comments (if any): ${commentsText}`, 33, 286.1);
      }

      const filename = `master-doc-${sanitizeFilePart(docRow.docNumber || docRow.id)}.pdf`;
      pdf.save(filename);
      toast.success("PDF downloaded.");
    } catch {
      toast.error("Could not generate PDF for this row.");
    }
  };

  const downloadMasterRowExcel = (docRow: MasterDocumentRow) => {
    const isP = pTypeDocument(docRow.type);
    const titleLabel = isP ? "Policy/Procedure/SOP Title" : "Form/Blank Template Title";
    const stepLane = isP
      ? "Created By: Abc  |  Reviewed By: Abc  |  Approved By: Abc"
      : "Capture By: Mr. Abc  |  Verified By: Mr. Abc  |  DISCARD";
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Arial, sans-serif; }
    .sheet { width: 1200px; border: 1px solid #bfbfbf; }
    .header { background: #f5f5f5; border-bottom: 1px solid #bfbfbf; padding: 8px; }
    .topline { display: flex; justify-content: space-between; font-size: 16px; font-weight: 700; }
    .title { margin-top: 8px; font-size: 16px; font-weight: 700; }
    .meta { margin-top: 6px; font-size: 12px; text-align: right; }
    .body { height: 560px; border-top: 1px solid #d4d4d4; border-bottom: 1px solid #d4d4d4; position: relative; }
    .watermark {
      position: absolute; left: 50%; top: 45%; transform: translate(-50%, -50%) rotate(-22deg);
      color: ${isP ? "#0ea5e9" : "#ea580c"}; font-size: 36px; font-weight: 700; opacity: 0.8;
      border: 2px solid #111; padding: 10px 18px;
    }
    .footer { background: #f5f5f5; padding: 8px; font-size: 12px; border-top: 1px solid #bfbfbf; }
    .small { font-size: 11px; color: #374151; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="topline">
        <span style="color:${isP ? "#6d28d9" : "#ea580c"}">Company Name</span>
        <span>Ref# ${docRow.documentRef}</span>
      </div>
      <div class="title">${titleLabel}: ${docRow.title}</div>
      <div class="meta">Standard: ${docRow.standard} | Clause: ${docRow.clause} | Subclause: ${docRow.subclause}</div>
    </div>
    <div class="body">
      <div class="watermark">Body of the Template ${isP ? "Procedure" : "form"}/ SAMPLE</div>
    </div>
    <div class="footer">
      ${stepLane}
      ${!isP ? `<div class="small">Comments (if any): Verified the checklist and found OK</div>` : ""}
    </div>
  </div>
</body>
</html>`;
    downloadTextFile(
      `master-doc-${sanitizeFilePart(docRow.docNumber || docRow.id)}.xls`,
      html,
      "application/vnd.ms-excel;charset=utf-8"
    );
    toast.success("Excel file downloaded.");
  };

  const downloadCurrentTableExcel = () => {
    if (!orgId) return;

    if (selectedTable === "Master Document List") {
      if (filteredMaster.length === 0) return;
      const headers = [
        "Document Ref.",
        "Nature of Document",
        "Title",
        "Type",
        "Site",
        "Process",
        "Standard",
        "Clause",
        "Subclause",
        "Doc#",
        "Version",
        "Plan Date",
        "Release Date",
        "Review Due (Lifecycle in Years)",
        "KPI",
        "Doc Status",
        "Doc Position",
        "Workflow Status",
      ];
      const rows = filteredMaster.map((docRow) => [
        docRow.documentRef,
        docRow.natureOfDocument,
        docRow.title,
        docRow.type,
        docRow.site,
        docRow.process,
        docRow.standard,
        docRow.clause,
        docRow.subclause,
        docRow.docNumber,
        docRow.version,
        docRow.planDate,
        docRow.releaseDate,
        docRow.reviewDue,
        docRow.kpi,
        docRow.docStatus,
        docRow.docPosition,
        docRow.workflowStatus,
      ]);
      downloadExcelTable("master-document-list.xls", headers, rows);
      toast.success("Excel file downloaded.");
      return;
    }

    if (selectedTable === "Obsolete Document Register") {
      if (filteredObsolete.length === 0) return;
      const headers = [
        "Document Ref.",
        "Title",
        "Type",
        "Process Owner",
        "Standard",
        "Site",
        "Doc#",
        "Version",
        "Obsoleted By",
        "Obsolete Date",
        "Replaced By",
        "Archived Location",
      ];
      const rows = filteredObsolete.map((row) => [
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
      ]);
      downloadExcelTable("obsolete-document-register.xls", headers, rows);
      toast.success("Excel file downloaded.");
      return;
    }

    if (selectedTable === "Documentary Evidence") {
      if (filteredEvidence.length === 0) return;
      const headers = [
        "Document Ref.",
        "Title",
        "Process Owner",
        "Batch/Lot#",
        "Year/Month",
        "Site",
        "Doc#",
        "Version",
        "Capture By",
        "Capture Date",
        "Verify By",
        "Verify Date",
        "KPI",
        "Record Status",
      ];
      const rows = filteredEvidence.map((row) => {
        const cd = (row.capture_data && typeof row.capture_data === "object" ? row.capture_data : {}) as Record<string, unknown>;
        const va = (row.verify_archive_data && typeof row.verify_archive_data === "object" ? row.verify_archive_data : {}) as Record<string, unknown>;
        const ref = row.template_preview_ref || String(cd.templateRef ?? "");
        const refParts = ref.split("/").filter(Boolean);
        const version = refParts.length > 0 ? refParts[refParts.length - 1] ?? "-" : "-";
        const site = refParts.length > 2 ? refParts[2] ?? "-" : "-";
        const processOwner = refParts.length > 3 ? refParts[3] ?? "-" : "-";
        const docNum = refParts.length > 5 ? refParts[5] ?? "-" : "-";
        const title = String(cd.capturedData ?? "").trim().slice(0, 60) || "-";
        const batch = String(cd.lotBatchSerial ?? "").trim() || "-";
        const captureDateObj = row.created_at ? new Date(row.created_at) : null;
        const yearMonth = captureDateObj
          ? `${captureDateObj.getFullYear()}/${String(captureDateObj.getMonth() + 1).padStart(2, "0")}`
          : "-";
        const captureBy = String(row.support_user_name ?? "").trim() || "-";
        const captureDate = captureDateObj
          ? captureDateObj.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
          : "-";
        const verifyBy = String(row.designated_verifier_name ?? "").trim() || "—";
        const verifyDate = va.completedAt
          ? new Date(String(va.completedAt)).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
          : "—";
        const daysSinceCapture = captureDateObj ? Math.floor((Date.now() - captureDateObj.getTime()) / 86400000) : 0;
        const kpiLabel = daysSinceCapture > 40 ? "Inconsistent" : daysSinceCapture > 30 ? "Pending" : "Consistent";
        const statusLabel = daysSinceCapture > 40 ? "Fail" : daysSinceCapture > 30 ? "Pending" : "Success";
        return [
          ref || "-",
          title,
          processOwner,
          batch,
          yearMonth,
          site,
          docNum,
          version,
          captureBy,
          captureDate,
          verifyBy,
          verifyDate,
          kpiLabel,
          statusLabel,
        ];
      });
      downloadExcelTable("documentary-evidence.xls", headers, rows);
      toast.success("Excel file downloaded.");
      return;
    }

    if (selectedTable === "Records Disposal Log") {
      if (filteredDisposal.length === 0) return;
      const headers = [
        "Record ID",
        "Description",
        "Disposed By",
        "Disposal Date",
        "Retention Period",
        "Disposal Method",
        "Storage Media",
      ];
      const rows = filteredDisposal.map((row) => {
        const cd = (row.capture_data && typeof row.capture_data === "object" ? row.capture_data : {}) as Record<string, unknown>;
        const va = (row.verify_archive_data && typeof row.verify_archive_data === "object" ? row.verify_archive_data : {}) as Record<string, unknown>;
        const shortId = row.id.slice(0, 4);
        const desc = String(cd.capturedData ?? "").trim().slice(0, 80) || "-";
        const disposedBy = String(row.designated_verifier_name ?? "").trim() || "-";
        const disposalDate = va.completedAt
          ? new Date(String(va.completedAt)).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
          : row.updated_at
            ? new Date(row.updated_at).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
            : "-";
        const retention = String(va.retentionPeriod ?? "").trim() || "3 Years";
        const storageRaw = String(va.archiveLocation ?? "").trim().toLowerCase();
        const isShred = storageRaw.includes("shred") || storageRaw.includes("physical");
        const disposalMethod = isShred ? "Shred" : "Delete";
        const storage = String(va.archiveLocation ?? "").trim() || "Cloud";
        return [shortId, desc, disposedBy, disposalDate, retention, disposalMethod, storage];
      });
      downloadExcelTable("records-disposal-log.xls", headers, rows);
      toast.success("Excel file downloaded.");
    }
  };

  const shareMasterRow = (_docRow: MasterDocumentRow, viewHref: string) => {
    const absoluteUrl =
      typeof window !== "undefined" ? new URL(viewHref, window.location.origin).toString() : viewHref;
    copyShareUrlToClipboard(absoluteUrl);
  };

  const copyDocumentViewLink = (recordId: string) => {
    if (!orgId) {
      toast.error("Could not copy link.");
      return;
    }
    const relativePath = `${createDocumentBaseHref}?recordId=${encodeURIComponent(recordId)}&mode=view`;
    const absoluteUrl =
      typeof window !== "undefined" ? new URL(relativePath, window.location.origin).toString() : relativePath;
    copyShareUrlToClipboard(absoluteUrl);
  };

  const copyDisposalShareLink = (recordId: string) => {
    if (!orgId) {
      toast.error("Could not copy link.");
      return;
    }
    const relativePath = `${getDashboardPath(orgId, "documents/documentary-evidence/verify")}?evidenceRecordId=${encodeURIComponent(recordId)}`;
    const absoluteUrl =
      typeof window !== "undefined" ? new URL(relativePath, window.location.origin).toString() : relativePath;
    copyShareUrlToClipboard(absoluteUrl);
  };

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
                className="flex items-center gap-2 bg-transparent hover:bg-transparent border border-[#5ea500] text-[#5ea500]"
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
          {selectedTable === "Obsolete Document Register" ? (
            <div
              className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-sm text-[#1E3A5F]"
              role="note"
            >
              <p className="font-semibold text-[#1E40AF]">Superseded versions and retention</p>
              <p className="mt-2 leading-relaxed">
                When a <span className="font-medium">new version</span> of a document is created as a revision and{" "}
                <span className="font-medium">approved</span>, the previous version is moved here automatically (it
                stays linked to the new active record). Obsolete rows are{" "}
                <span className="font-medium">permanently deleted</span> once{" "}
                <span className="font-medium">three years</span> have passed since they became obsolete; cleanup runs
                when document lists are loaded.
              </p>
            </div>
          ) : null}
          {selectedTable === "Documentary Evidence" ? (
            <div
              className="rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-sm text-[#166534]"
              role="note"
            >
              <p className="font-semibold text-[#15803D]">Captured F-type evidence records — awaiting verification</p>
              <p className="mt-2 leading-relaxed">
                This table shows F-type documentary evidence records where the <span className="font-medium">capture step is complete</span> but
                verification is still pending. Once the designated verifier completes Verify &amp; Archive, the record moves to the{" "}
                <span className="font-medium">Records Disposal Log</span>.
              </p>
            </div>
          ) : null}
          {selectedTable === "Records Disposal Log" ? (
            <div
              className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-sm text-[#1E3A5F]"
              role="note"
            >
              <p className="font-semibold text-[#1E40AF]">Completed evidence records — verified &amp; archived</p>
              <p className="mt-2 leading-relaxed">
                Records appear here once <span className="font-medium">both</span> steps are finished: capture by Support Leadership and
                verification by the designated Top/Operational verifier. Each row shows the retention period and archive location
                set during verification.
              </p>
            </div>
          ) : null}
          {selectedTable === "Master Document List" ? (
            <div
              className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-sm text-[#4B5563]"
              role="note"
            >
              <p className="leading-relaxed">
                Revising an <span className="font-medium">approved</span> document creates a new version; when that new
                version completes approval, the prior version appears in the{" "}
                <span className="font-medium">Obsolete Document Register</span>.
              </p>
            </div>
          ) : null}
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
                  placeholder="Search..."
                />
              </div>

              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={downloadCurrentTableExcel}
                disabled={
                  !orgId ||
                  (selectedTable === "Master Document List" && filteredMaster.length === 0) ||
                  (selectedTable === "Obsolete Document Register" && filteredObsolete.length === 0) ||
                  (selectedTable === "Documentary Evidence" && filteredEvidence.length === 0) ||
                  (selectedTable === "Records Disposal Log" && filteredDisposal.length === 0)
                }
              >
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
                  {!documentsLoaded && orgId ? (
                    <TableRow>
                      <TableCell colSpan={18} className="py-12 text-center text-sm text-muted-foreground">
                        Loading documents…
                      </TableCell>
                    </TableRow>
                  ) : filteredMaster.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={18} className="py-12 text-center text-sm text-muted-foreground">
                        {!orgId
                          ? "Open this page from your organization dashboard to load documents."
                          : masterApiRows.length === 0
                            ? "No active documents yet. Use Create Document to add one."
                            : "No documents match your search."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMaster.map((doc) => (
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
                            row={doc}
                            viewHref={`${createDocumentBaseHref}?recordId=${encodeURIComponent(doc.id)}&mode=view`}
                            editHref={`${createDocumentBaseHref}?recordId=${encodeURIComponent(doc.id)}&mode=edit`}
                            canEditDirectly={doc.workflowStatus !== "approved"}
                            reviseUpdateHref={`${createDocumentBaseHref}?recordId=${encodeURIComponent(doc.id)}&mode=edit&revisionType=update`}
                            reviseTransferHref={`${createDocumentBaseHref}?recordId=${encodeURIComponent(doc.id)}&mode=edit&revisionType=transfer`}
                            workflowStatus={doc.workflowStatus}
                            onShare={shareMasterRow}
                            onDownloadPdf={downloadMasterRowPdf}
                            onDownloadExcel={downloadMasterRowExcel}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
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
                  {!documentsLoaded && orgId ? (
                    <TableRow>
                      <TableCell colSpan={13} className="py-12 text-center text-sm text-muted-foreground">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : filteredObsolete.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} className="py-12 text-center text-sm text-muted-foreground">
                        {!orgId
                          ? "Open this page from your organization dashboard to load documents."
                          : obsoleteApiRows.length === 0
                            ? "No obsolete documents. Superseded versions appear here after a new revision is approved."
                            : "No obsolete documents match your search."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredObsolete.map((row) => (
                    <TableRow
                      key={row.id}
                      className="border-b border-border bg-background hover:bg-muted/30"
                    >
                      <TableCell className="px-3 py-2.5 pl-4 text-sm font-medium text-foreground whitespace-nowrap">
                        {row.documentRef}
                      </TableCell>
                      <TableCell className="max-w-56 px-3 py-2.5 text-sm text-foreground whitespace-normal">
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
                        <ObsoleteDocumentRowActionsMenu onShare={() => void copyDocumentViewLink(row.id)} />
                      </TableCell>
                    </TableRow>
                    ))
                  )}
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
                      hint="≤30d Green · >30d Yellow · >40d Red"
                    />
                    <ObsoleteRegisterColumnHead
                      align="center"
                      title="Record Status"
                      hint="Success / Pending / Fail"
                    />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!evidenceLoaded ? (
                    <TableRow>
                      <TableCell colSpan={14} className="py-12 text-center text-sm text-muted-foreground">
                        Loading evidence records…
                      </TableCell>
                    </TableRow>
                  ) : filteredEvidence.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={14} className="py-12 text-center text-sm text-muted-foreground">
                        {evidenceCapturedOnly.length === 0
                          ? "No documentary evidence records loaded yet. This view will use captured F-type records when the API is connected."
                          : "No records match your search."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEvidence.map((row) => {
                      const cd = (row.capture_data && typeof row.capture_data === "object" ? row.capture_data : {}) as Record<string, unknown>;
                      const va = (row.verify_archive_data && typeof row.verify_archive_data === "object" ? row.verify_archive_data : {}) as Record<string, unknown>;
                      const ref = row.template_preview_ref || String(cd.templateRef ?? "");
                      const refParts = ref.split("/").filter(Boolean);
                      const version = refParts.length > 0 ? refParts[refParts.length - 1] : "-";
                      const site = refParts.length > 2 ? refParts[2] : "-";
                      const processOwner = refParts.length > 3 ? refParts[3] : "-";
                      const docNum = refParts.length > 5 ? refParts[5] : "-";
                      const title = String(cd.capturedData ?? "").trim().slice(0, 60) || "-";
                      const batch = String(cd.lotBatchSerial ?? "").trim() || "-";
                      const captureDateObj = row.created_at ? new Date(row.created_at) : null;
                      const yearMonth = captureDateObj
                        ? `${captureDateObj.getFullYear()}/${String(captureDateObj.getMonth() + 1).padStart(2, "0")}`
                        : "-";
                      const captureBy = String(row.support_user_name ?? "").trim() || "-";
                      const captureDate = captureDateObj
                        ? captureDateObj.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
                        : "-";
                      const verifyBy = String(row.designated_verifier_name ?? "").trim() || "—";
                      const verifyDate = va.completedAt
                        ? new Date(String(va.completedAt)).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
                        : "—";
                      const daysSinceCapture = captureDateObj ? Math.floor((Date.now() - captureDateObj.getTime()) / 86400000) : 0;
                      const kpiLabel = daysSinceCapture > 40 ? "Inconsistent" : daysSinceCapture > 30 ? "Pending" : "Consistent";
                      const kpiColor = daysSinceCapture > 40 ? "text-red-600" : daysSinceCapture > 30 ? "text-amber-600" : "text-[#22B323]";
                      const statusLabel = daysSinceCapture > 40 ? "Fail" : daysSinceCapture > 30 ? "Pending" : "Success";
                      const statusBg = daysSinceCapture > 40 ? "bg-red-500" : daysSinceCapture > 30 ? "bg-amber-500" : "bg-[#22B323]";

                      return (
                        <TableRow key={row.id} className="border-b border-border hover:bg-muted/20">
                          <TableCell className="px-3 py-2.5 text-sm font-medium text-foreground whitespace-nowrap">
                            {ref || "-"}
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-foreground max-w-[180px]">
                            {title}
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-foreground">{processOwner}</TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-foreground">{batch}</TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-foreground whitespace-nowrap">{yearMonth}</TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-foreground">{site}</TableCell>
                          <TableCell className="px-3 py-2.5 text-sm font-bold text-foreground">{docNum}</TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-foreground">{version}</TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-foreground">{captureBy}</TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-foreground whitespace-nowrap">{captureDate}</TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-foreground">{verifyBy}</TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-foreground whitespace-nowrap">{verifyDate}</TableCell>
                          <TableCell className="px-3 py-2.5 text-center">
                            <span className={cn("text-sm font-semibold", kpiColor)}>{kpiLabel}</span>
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-center">
                            <span className={cn("inline-block rounded-md px-3 py-1 text-xs font-semibold text-white", statusBg)}>
                              {statusLabel}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
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
                  {!evidenceLoaded ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                        Loading disposal records…
                      </TableCell>
                    </TableRow>
                  ) : filteredDisposal.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                        {evidenceCompletedOnly.length === 0
                          ? "No disposal log entries yet. This view will list disposed records when the API is connected."
                          : "No records match your search."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDisposal.map((row) => {
                      const cd = (row.capture_data && typeof row.capture_data === "object" ? row.capture_data : {}) as Record<string, unknown>;
                      const va = (row.verify_archive_data && typeof row.verify_archive_data === "object" ? row.verify_archive_data : {}) as Record<string, unknown>;
                      const shortId = row.id.slice(0, 4);
                      const desc = String(cd.capturedData ?? "").trim().slice(0, 80) || "-";
                      const disposedBy = String(row.designated_verifier_name ?? "").trim() || "-";
                      const disposalDate = va.completedAt
                        ? new Date(String(va.completedAt)).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
                        : row.updated_at
                          ? new Date(row.updated_at).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
                          : "-";
                      const retention = String(va.retentionPeriod ?? "").trim() || "3 Years";
                      const storageRaw = String(va.archiveLocation ?? "").trim().toLowerCase();
                      const isShred = storageRaw.includes("shred") || storageRaw.includes("physical");
                      const disposalMethod = isShred ? "Shred" : "Delete";
                      const disposalMethodColor = isShred
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-red-50 text-red-700 border-red-200";
                      const storage = String(va.archiveLocation ?? "").trim() || "Cloud";
                      const storageIcon = storage.toLowerCase().includes("cloud")
                        ? Cloud
                        : storage.toLowerCase().includes("server")
                          ? Server
                          : storage.toLowerCase().includes("physical")
                            ? HardDrive
                            : Cloud;
                      const StorageIcon = storageIcon;

                      return (
                        <TableRow key={row.id} className="border-b border-border hover:bg-muted/20">
                          <TableCell className="px-3 py-2.5 text-sm font-semibold text-foreground">{shortId}</TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-foreground max-w-[220px]">{desc}</TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-foreground">{disposedBy}</TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-foreground whitespace-nowrap">{disposalDate}</TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-foreground">{retention}</TableCell>
                          <TableCell className="px-3 py-2.5">
                            <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", disposalMethodColor)}>
                              <Scissors className="h-3 w-3" />
                              {disposalMethod}
                            </span>
                          </TableCell>
                          <TableCell className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
                              <StorageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              {storage}
                            </span>
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-center">
                            <DropdownMenu modal={false}>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuLabel className="text-xs text-muted-foreground">Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="gap-2 text-sm">
                                  <Eye className="h-4 w-4" /> View
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                                  <button
                                    type="button"
                                    className="relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none select-none focus:bg-accent focus:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
                                    onClick={() => copyDisposalShareLink(row.id)}
                                  >
                                    <Share2 className="h-4 w-4" /> Share
                                  </button>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 text-sm">
                                  <FileDown className="h-4 w-4" /> Download PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 text-sm">
                                  <FileSpreadsheet className="h-4 w-4" /> Download Excel
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
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
                  {!documentsLoaded && orgId ? (
                    <TableRow>
                      <TableCell colSpan={13} className="py-12 text-center text-sm text-muted-foreground">
                        Loading documents…
                      </TableCell>
                    </TableRow>
                  ) : filteredMaster.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} className="py-12 text-center text-sm text-muted-foreground">
                        {!orgId
                          ? "Open this page from your organization dashboard to load documents."
                          : masterApiRows.length === 0
                            ? "No active documents yet."
                            : "No documents match your search."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMaster.map((doc) => (
                      <TableRow key={doc.id}>
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
                    ))
                  )}
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
                  Draft + Capture -&gt; Verify &amp; Archive -&gt; Dispose
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


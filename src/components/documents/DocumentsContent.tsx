"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { generateMasterDocumentListPdfAsync } from "@/lib/masterDocumentPdf";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  paginateRows,
  TablePagination,
} from "@/components/ui/table-pagination";
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
import {
  docAlertInfo,
  docAlertNote,
  docAlertNoteTitle,
  docAlertSuccess,
  docDocStatus,
  docDropdownContent,
  docMenuItemAccent,
  docMenuItemPrimary,
  docPositionBadge,
  docSearchInput,
  docSelectTrigger,
  docStatusBadgeDanger,
  docStatusBadgeSuccess,
  docStatusBadgeWarning,
} from "@/lib/document-ui-classes";
import { toast } from "sonner";
import { getComplianceKpiFromDays, getDaysSince } from "@/lib/compliance-kpi";
import { KpiStatusLogicCard } from "@/components/compliance/KpiStatusLogicCard";
import { useTranslate } from "@/components/providers/translation-provider";
import {
  applyDraftPlaceholderRef,
  DRAFT_DOC_NUMBER,
  isDraftPlaceholderRef,
} from "@/lib/documentRef";
import {
  buildManagementStandardNameMap,
  resolveManagementStandardLabel,
} from "@/lib/management-standard-label";

function displayCell(value: string, t: (text: string) => string): string {
  if (!value || value === "-") return t("—");
  return value;
}

function formatLocaleDate(
  value: Date | string | null | undefined,
  locale: string
): string {
  if (!value) return "-";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export type MasterDocumentRow = {
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
  createdByUserId?: string;
  processOwnerUserId?: string;
  approverUserId?: string;
  /** From DB when review completed */
  reviewedByRecordName?: string;
  approvedByRecordName?: string;
  approvedByUserId?: string;
  reviewedAtLabel?: string;
  approvedAtLabel?: string;
};

type DocumentsApiRecord = {
  id: string;
  status: "draft" | "submitted";
  preview_doc_ref: string;
  form_data: Record<string, unknown> | null;
  wizard_data: Record<string, unknown> | null;
  workflow_status?: "draft" | "in_review" | "in_approval" | "approved";
  lifecycle_status?: "active" | "obsolete";
  created_by_user_id?: string | null;
  created_by_user_name: string | null;
  reviewed_by_user_name?: string | null;
  reviewed_at?: string | null;
  approved_at?: string | null;
  approved_by_user_name?: string | null;
  approved_by_user_id?: string | null;
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

function copyShareUrlToClipboard(absoluteUrl: string, t: (text: string) => string): void {
  const showManualFallback = () => {
    toast.message(t("Copy this link"), {
      description: absoluteUrl,
      duration: 25_000,
    });
  };

  if (copyTextToClipboardSync(absoluteUrl)) {
    toast.success(t("Link copied to clipboard."));
    return;
  }
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText && window.isSecureContext) {
    void navigator.clipboard.writeText(absoluteUrl).then(
      () => toast.success(t("Link copied to clipboard.")),
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
  kpi: "Consistent" | "Pending" | "Inconsistent";
  recordStatus: "Success" | "Pending" | "Fail";
  recordRank: "Verified" | "Captured" | "Archived";
};

type RecordsDisposalRow = {
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
  const { t } = useTranslate();
  return (
    <Badge
      variant="outline"
      className="rounded-md border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
    >
      {t(label)}
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
  const { t } = useTranslate();
  const map: Record<DocumentaryEvidenceRow["kpi"], string> = {
    Consistent: "text-primary",
    Pending: "text-amber-600 dark:text-amber-400",
    Inconsistent: "text-destructive",
  };
  return <span className={cn("text-sm font-medium", map[kpi])}>{t(kpi)}</span>;
}

function EvidenceRecordStatusBadge({ status }: { status: DocumentaryEvidenceRow["recordStatus"] }) {
  const { t } = useTranslate();
  const map: Record<DocumentaryEvidenceRow["recordStatus"], string> = {
    Success: docStatusBadgeSuccess,
    Pending: docStatusBadgeWarning,
    Fail: docStatusBadgeDanger,
  };
  return (
    <Badge
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-semibold",
        map[status]
      )}
    >
      {t(status)}
    </Badge>
  );
}

function RetentionPeriodBadge({ label }: { label: string }) {
  const { t } = useTranslate();
  return (
    <Badge
      variant="outline"
      className="rounded-md border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
    >
      {t(label)}
    </Badge>
  );
}

function DisposalMethodBadge({ method }: { method: RecordsDisposalRow["disposalMethod"] }) {
  const { t } = useTranslate();
  if (method === "Delete") {
    return (
      <Badge className="gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive shadow-none hover:bg-destructive/10">
        <Trash2 className="size-3.5" aria-hidden />
        {t("Delete")}
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground shadow-none hover:bg-muted">
      <Scissors className="size-3.5" aria-hidden />
      {t("Shred")}
    </Badge>
  );
}

function StorageMediaCell({ media }: { media: RecordsDisposalRow["storageMedia"] }) {
  const { t } = useTranslate();
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
      <span>{t(label)}</span>
    </div>
  );
}

function EvidenceRecordRankBadge({ rank }: { rank: DocumentaryEvidenceRow["recordRank"] }) {
  const { t } = useTranslate();
  const map: Record<DocumentaryEvidenceRow["recordRank"], string> = {
    Verified: docStatusBadgeSuccess,
    Captured: docStatusBadgeWarning,
    Archived: "border-transparent bg-muted-foreground text-primary-foreground shadow-none hover:bg-muted-foreground/90",
  };
  return (
    <Badge
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-semibold",
        map[rank]
      )}
    >
      {t(rank)}
    </Badge>
  );
}

function DocStatusBadge({ status }: { status: MasterDocumentRow["docStatus"] }) {
  const { t } = useTranslate();
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", docDocStatus[status])}>
      {t(status)}
    </span>
  );
}

function DocPositionBadge({ position }: { position: MasterDocumentRow["docPosition"] }) {
  const { t } = useTranslate();
  const tone =
    position === "Draft"
      ? docPositionBadge.Draft
      : position === "Review Pending"
        ? docPositionBadge["Review Pending"]
        : position === "Approval Pending"
          ? docPositionBadge["Approval Pending"]
          : position === "Needs Review Again"
            ? docPositionBadge["Needs Review Again"]
            : docPositionBadge.default;
  return (
    <span className={cn("inline-flex rounded-md px-2.5 py-1 text-xs font-semibold", tone)}>
      {t(position)}
    </span>
  );
}

function complianceStatusTextClass(statusLabel: string): string {
  if (statusLabel === "Success" || statusLabel === "In-Progress") return "text-primary-foreground";
  if (statusLabel === "Fail") return "text-destructive-foreground";
  return "text-primary-foreground";
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
  onDownloadPdf: (row: MasterDocumentRow) => void | Promise<void>;
  onDownloadExcel: (row: MasterDocumentRow) => void;
}) {
  const { t } = useTranslate();
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
      ? t("Submit for Approval")
      : workflowStatus === "in_approval"
        ? t("Open Approval")
        : t("Submit for Review");
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground data-[state=open]:bg-muted"
          aria-label={t("Row actions")}
        >
          <MoreVertical size={18} aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[220px] rounded-xl border border-border bg-popover p-2 shadow-lg"
      >
        <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg py-2 text-sm text-foreground focus:bg-muted">
          <Link href={viewHref}>
            <Eye size={16} className="text-muted-foreground" aria-hidden />
            {t("View")}
          </Link>
        </DropdownMenuItem>
        {canEditDirectly ? (
          <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg py-2 text-sm text-foreground focus:bg-muted">
            <Link href={editHref}>
              <Pencil size={16} className="text-muted-foreground" aria-hidden />
              {t("Edit")}
            </Link>
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
              {t("Revision Required")}
            </DropdownMenuLabel>
            <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg py-2 text-sm text-foreground focus:bg-muted">
              <Link href={reviseUpdateHref}>
                <Pencil size={16} className="text-muted-foreground" aria-hidden />
                {t("Revise & Update")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg py-2 text-sm text-foreground focus:bg-muted">
              <Link href={reviseTransferHref}>
                <Pencil size={16} className="text-muted-foreground" aria-hidden />
                {t("Revise & Transfer")}
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
          <button
            type="button"
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-primary outline-none focus:bg-accent focus:text-accent-foreground [&_svg]:text-primary"
            onClick={() => {
              void onShare(row, viewHref);
            }}
          >
            <Share2 size={16} />
            {t("Share")}
          </button>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer gap-2 rounded-lg py-2 text-sm text-muted-foreground focus:bg-muted focus:text-muted-foreground [&_svg]:text-muted-foreground"
          onSelect={() => {
            void onDownloadPdf(row);
          }}
        >
          <FileDown size={16} />
          {t("Download PDF")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className={docMenuItemAccent}
          onSelect={() => onDownloadExcel(row)}
        >
          <FileSpreadsheet size={16} />
          {t("Download Excel")}
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-2 bg-border" />
        <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
          {t("Workflow")}
        </DropdownMenuLabel>
        <DropdownMenuItem
          asChild
          className={docMenuItemPrimary}
        >
          <Link href={workflowHref}>
            <Send size={16} aria-hidden />
            {workflowLabel}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ObsoleteDocumentRowActionsMenu({ onShare }: { onShare: () => void }) {
  const { t } = useTranslate();
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={t("Row actions")}
        >
          <MoreVertical className="size-[18px]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn("w-[200px]", docDropdownContent)}
      >
        <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg py-2 text-sm text-foreground focus:bg-muted focus:text-foreground">
          <Eye size={16} className="text-foreground" aria-hidden />
          {t("View")}
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
          <button
            type="button"
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-primary outline-none focus:bg-accent focus:text-accent-foreground [&_svg]:text-primary"
            onClick={() => onShare()}
          >
            <Share2 size={16} aria-hidden />
            {t("Share")}
          </button>
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg py-2 text-sm text-muted-foreground focus:bg-muted focus:text-muted-foreground [&_svg]:text-muted-foreground">
          <FileDown size={16} aria-hidden />
          {t("Download PDF")}
        </DropdownMenuItem>
        <DropdownMenuItem className={docMenuItemPrimary}>
          <FileSpreadsheet size={16} />
          {t("Download Excel")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DocumentaryEvidenceRowActionsMenu() {
  const { t } = useTranslate();
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={t("Row actions")}
        >
          <MoreVertical className="size-[18px]" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn("w-[220px]", docDropdownContent)}
      >
        <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg py-2 text-sm text-foreground focus:bg-muted">
          <Eye size={16} className="text-foreground" aria-hidden />
          {t("View")}
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg py-2 text-sm text-foreground focus:bg-muted">
          <Pencil size={16} className="text-foreground" aria-hidden />
          {t("Edit")}
        </DropdownMenuItem>
        <DropdownMenuItem className={docMenuItemPrimary}>
          <Share2 size={16} />
          {t("Share")}
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg py-2 text-sm text-muted-foreground focus:bg-muted focus:text-muted-foreground [&_svg]:text-muted-foreground">
          <FileDown size={16} aria-hidden />
          {t("Download PDF")}
        </DropdownMenuItem>
        <DropdownMenuItem className={docMenuItemPrimary}>
          <FileSpreadsheet size={16} />
          {t("Download Excel")}
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-2 bg-border" />
        <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
          {t("Record lifecycle")}
        </DropdownMenuLabel>
        <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg py-2 text-sm text-muted-foreground focus:bg-muted focus:text-muted-foreground [&_svg]:text-muted-foreground">
          <Archive size={16} aria-hidden />
          {t("Archive Record")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RecordsDisposalRowActionsMenu() {
  const { t } = useTranslate();
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={t("Row actions")}
        >
          <MoreVertical className="size-[18px]" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn("w-[220px]", docDropdownContent)}
      >
        <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg py-2 text-sm text-foreground focus:bg-muted">
          <Eye size={16} className="text-foreground" aria-hidden />
          {t("View")}
        </DropdownMenuItem>
        <DropdownMenuItem className={docMenuItemPrimary}>
          <Share2 size={16} />
          {t("Share")}
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg py-2 text-sm text-muted-foreground focus:bg-muted focus:text-muted-foreground [&_svg]:text-muted-foreground">
          <FileDown size={16} aria-hidden />
          {t("Download PDF")}
        </DropdownMenuItem>
        <DropdownMenuItem className={docMenuItemPrimary}>
          <FileSpreadsheet size={16} />
          {t("Download Excel")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function DocumentsContent() {
  const params = useParams();
  const { t, locale } = useTranslate();
  const orgId = (params?.orgId as string) || "";
  const createDocumentHref = orgId ? getDashboardPath(orgId, "documents/create") : "#";
  const createDocumentBaseHref = orgId ? getDashboardPath(orgId, "documents/create") : "#";
  const documentaryEvidenceTemplatesHref = orgId
    ? getDashboardPath(orgId, "documents/documentary-evidence")
    : "#";
  const [selectedTable, setSelectedTable] = useState<string>("Master Document List");
  const [search, setSearch] = useState("");
  const [tablePage, setTablePage] = useState(1);
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
  const [myDraftId, setMyDraftId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function loadMyDraft() {
      if (!orgId) {
        setMyDraftId(null);
        return;
      }
      try {
        const res = await fetch(`/api/organization/${orgId}/documents?myDraft=1`, {
          credentials: "include",
        });
        if (!res.ok || ignore) return;
        const json = (await res.json()) as { draft?: { id?: string } | null };
        setMyDraftId(String(json?.draft?.id ?? "").trim() || null);
      } catch {
        if (!ignore) setMyDraftId(null);
      }
    }
    void loadMyDraft();
    return () => {
      ignore = true;
    };
  }, [orgId]);

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
        const [activeRes, obsoleteRes, checklistsRes] = await Promise.all([
          fetch(`/api/organization/${orgId}/documents?lifecycle=active`, {
            credentials: "include",
          }),
          fetch(`/api/organization/${orgId}/documents?lifecycle=obsolete`, {
            credentials: "include",
          }),
          fetch(`/api/organization/${orgId}/audit-checklists`, {
            credentials: "include",
          }),
        ]);
        const activeJson = activeRes.ok ? await activeRes.json() : { records: [] };
        const obsoleteJson = obsoleteRes.ok ? await obsoleteRes.json() : { records: [] };
        const checklistsJson = checklistsRes.ok
          ? await checklistsRes.json()
          : { checklists: [] };
        if (ignore) return;

        const standardNameById = buildManagementStandardNameMap(
          Array.isArray(checklistsJson?.checklists) ? checklistsJson.checklists : []
        );
        const resolveStandard = (raw: unknown) =>
          resolveManagementStandardLabel(String(raw ?? ""), standardNameById);

        const records = Array.isArray(activeJson?.records)
          ? (activeJson.records as DocumentsApiRecord[])
          : [];
        const obsoleteRecords = Array.isArray(obsoleteJson?.records)
          ? (obsoleteJson.records as DocumentsApiRecord[])
          : [];

        const formatDate = (value: string | null | undefined): string =>
          formatLocaleDate(value, locale);

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

          let documentRef = String(row.preview_doc_ref ?? "").trim() || "-";
          const actionType = String(wizard.actionType ?? "").toLowerCase();
          const natureOfDocument =
            actionType === "revise"
              ? "Revision"
              : actionType === "obsolete"
                ? "Obsolete"
                : "New Document";

          const standard = resolveStandard(formData.managementStandard);

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
          if (
            workflowStatus === "draft" &&
            documentRef !== "-" &&
            !isDraftPlaceholderRef(documentRef)
          ) {
            documentRef = applyDraftPlaceholderRef(documentRef);
          }
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
            docNumber:
              workflowStatus === "draft" || isDraftPlaceholderRef(documentRef)
                ? DRAFT_DOC_NUMBER
                : resolveMasterDocNumber(row),
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
            createdByUserId: String(row.created_by_user_id ?? "").trim(),
            processOwnerUserId: String(formData.processOwnerUserId ?? "").trim(),
            approverUserId: String(formData.approverUserId ?? "").trim(),
            reviewedByRecordName: String(row.reviewed_by_user_name ?? "").trim(),
            approvedByRecordName: String(row.approved_by_user_name ?? "").trim(),
            approvedByUserId: String(row.approved_by_user_id ?? "").trim(),
            reviewedAtLabel: reviewedAtRaw ? formatDate(reviewedAtRaw) : "",
            approvedAtLabel: String((row as DocumentsApiRecord).approved_at ?? "").trim()
              ? formatDate(String((row as DocumentsApiRecord).approved_at))
              : "",
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
            standard: resolveStandard(formData.managementStandard),
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
  }, [orgId, locale]);

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

  useEffect(() => {
    setTablePage(1);
  }, [selectedTable, search]);

  const activeTableRowCount = useMemo(() => {
    switch (selectedTable) {
      case "Master Document List":
        return filteredMaster.length;
      case "Obsolete Document Register":
        return filteredObsolete.length;
      case "Documentary Evidence":
        return filteredEvidence.length;
      case "Records Disposal Log":
        return filteredDisposal.length;
      default:
        return filteredMaster.length;
    }
  }, [selectedTable, filteredMaster, filteredObsolete, filteredEvidence, filteredDisposal]);

  const paginatedMaster = useMemo(
    () => paginateRows(filteredMaster, tablePage, DEFAULT_TABLE_PAGE_SIZE),
    [filteredMaster, tablePage]
  );
  const paginatedObsolete = useMemo(
    () => paginateRows(filteredObsolete, tablePage, DEFAULT_TABLE_PAGE_SIZE),
    [filteredObsolete, tablePage]
  );
  const paginatedEvidence = useMemo(
    () => paginateRows(filteredEvidence, tablePage, DEFAULT_TABLE_PAGE_SIZE),
    [filteredEvidence, tablePage]
  );
  const paginatedDisposal = useMemo(
    () => paginateRows(filteredDisposal, tablePage, DEFAULT_TABLE_PAGE_SIZE),
    [filteredDisposal, tablePage]
  );

  const downloadMasterRowPdf = async (docRow: MasterDocumentRow) => {
    try {
      const pdf = await generateMasterDocumentListPdfAsync(
        {
          documentRef: docRow.documentRef,
          title: docRow.title,
          type: docRow.type,
          site: docRow.site,
          process: docRow.process,
          standard: docRow.standard,
          clause: docRow.clause,
          subclause: docRow.subclause,
          docNumber: docRow.docNumber,
          version: docRow.version,
          planDate: docRow.planDate,
          releaseDate: docRow.releaseDate,
          workflowStatus: docRow.workflowStatus,
          docPosition: docRow.docPosition,
          docStatus: docRow.docStatus,
          mainContent: docRow.mainContent ?? "",
          createdByName: docRow.createdByName ?? "",
          processOwnerName: docRow.processOwnerName ?? "",
          approverName: docRow.approverName ?? "",
          reviewedByRecordName: docRow.reviewedByRecordName ?? "",
          approvedByRecordName: docRow.approvedByRecordName ?? "",
          createdByUserId: docRow.createdByUserId ?? "",
          processOwnerUserId: docRow.processOwnerUserId ?? "",
          approverUserId: docRow.approverUserId ?? "",
          approvedByUserId: docRow.approvedByUserId ?? "",
          reviewedAtLabel: docRow.reviewedAtLabel ?? "",
          approvedAtLabel: docRow.approvedAtLabel ?? "",
        },
        organizationName
      );
      const filename = `master-doc-${sanitizeFilePart(docRow.docNumber || docRow.id)}.pdf`;
      pdf.save(filename);
      toast.success(t("PDF downloaded."));
    } catch {
      toast.error(t("Could not generate PDF for this row."));
    }
  };

  const downloadMasterRowExcel = (docRow: MasterDocumentRow) => {
    const isP = pTypeDocument(docRow.type);
    const titleLabel = isP ? t("Policy/Procedure/SOP Title") : t("Form/Blank Template Title");
    const wf = docRow.workflowStatus;
    const hasReviewed = wf === "in_approval" || wf === "approved";
    const hasApproved = wf === "approved";
    const revLabel = hasReviewed
      ? String(docRow.reviewedByRecordName || docRow.processOwnerName || "").trim() || "na"
      : "na";
    const appLabel = hasApproved
      ? String(docRow.approvedByRecordName || docRow.approverName || "").trim() || "na"
      : "na";
    const capLabel = String(docRow.createdByName ?? "").trim() || "na";
    const verLabel = hasApproved ? appLabel : "na";
    const stepLane = isP
      ? `${t("Created By")}: ${capLabel} | ${t("Reviewed By")}: ${revLabel} | ${t("Approved By")}: ${appLabel}`
      : `${t("Capture By")}: ${capLabel} | ${t("Verified By")}: ${verLabel} | ${t("DISCARD")}`;
    const bodyPlain = htmlToPlain(docRow.mainContent ?? "") || docRow.title || t("—");
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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
    .body { min-height: 360px; border-top: 1px solid #d4d4d4; border-bottom: 1px solid #d4d4d4; padding: 16px; font-size: 12px; white-space: pre-wrap; color: #111827; }
    .footer { background: #f5f5f5; padding: 8px; font-size: 12px; border-top: 1px solid #bfbfbf; }
    .small { font-size: 11px; color: #374151; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="topline">
        <span style="color:${isP ? "#6d28d9" : "#ea580c"}">${esc(organizationName || t("Company Name"))}</span>
        <span>${esc(t("Ref#"))} ${esc(docRow.documentRef)}</span>
      </div>
      <div class="title">${esc(titleLabel)}: ${esc(docRow.title)}</div>
      <div class="meta">${esc(t("Site"))}: ${esc(docRow.site)} | ${esc(t("Process"))}: ${esc(docRow.process)} | ${esc(t("Standard"))}: ${esc(docRow.standard)} | ${esc(t("Clause"))}: ${esc(docRow.clause)} | ${esc(t("Subclause"))}: ${esc(docRow.subclause)}</div>
    </div>
    <div class="body">${esc(bodyPlain)}</div>
    <div class="footer">
      ${stepLane}
      ${!isP ? `<div class="small">${esc(t("Comments (if any): Workflow"))} ${esc(docRow.docPosition)} (${esc(docRow.docStatus)})</div>` : ""}
    </div>
  </div>
</body>
</html>`;
    downloadTextFile(
      `master-doc-${sanitizeFilePart(docRow.docNumber || docRow.id)}.xls`,
      html,
      "application/vnd.ms-excel;charset=utf-8"
    );
    toast.success(t("Excel file downloaded."));
  };

  const downloadCurrentTableExcel = () => {
    if (!orgId) return;

    if (selectedTable === "Master Document List") {
      if (filteredMaster.length === 0) return;
      const headers = [
        t("Document Ref."),
        t("Nature of Document"),
        t("Title"),
        t("Type"),
        t("Site"),
        t("Process"),
        t("Standard"),
        t("Clause"),
        t("Subclause"),
        t("Doc#"),
        t("Version"),
        t("Plan Date"),
        t("Release Date"),
        t("Review Due (Lifecycle in Years)"),
        t("KPI"),
        t("Doc Status"),
        t("Doc Position"),
        t("Workflow Status"),
      ];
      const rows = filteredMaster.map((docRow) => [
        docRow.documentRef,
        t(docRow.natureOfDocument),
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
        t(docRow.kpi),
        t(docRow.docStatus),
        t(docRow.docPosition),
        t(
          docRow.workflowStatus === "in_review"
            ? "In review"
            : docRow.workflowStatus === "in_approval"
              ? "In approval"
              : docRow.workflowStatus === "approved"
                ? "Approved"
                : "Draft"
        ),
      ]);
      downloadExcelTable("master-document-list.xls", headers, rows);
      toast.success(t("Excel file downloaded."));
      return;
    }

    if (selectedTable === "Obsolete Document Register") {
      if (filteredObsolete.length === 0) return;
      const headers = [
        t("Document Ref."),
        t("Title"),
        t("Type"),
        t("Process Owner"),
        t("Standard"),
        t("Site"),
        t("Doc#"),
        t("Version"),
        t("Obsoleted By"),
        t("Obsolete Date"),
        t("Replaced By"),
        t("Archived Location"),
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
      toast.success(t("Excel file downloaded."));
      return;
    }

    if (selectedTable === "Documentary Evidence") {
      if (filteredEvidence.length === 0) return;
      const headers = [
        t("Document Ref."),
        t("Title"),
        t("Process Owner"),
        t("Batch/Lot#"),
        t("Year/Month"),
        t("Site"),
        t("Doc#"),
        t("Version"),
        t("Capture By"),
        t("Capture Date"),
        t("Verify By"),
        t("Verify Date"),
        t("KPI"),
        t("Record Status"),
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
          ? formatLocaleDate(captureDateObj, locale)
          : "-";
        const verifyBy = String(row.designated_verifier_name ?? "").trim() || "-";
        const verifyDate = va.completedAt
          ? formatLocaleDate(String(va.completedAt), locale)
          : "-";
        const daysSinceCapture = captureDateObj ? getDaysSince(captureDateObj) : 0;
        const { kpiLabel, statusLabel } = getComplianceKpiFromDays(daysSinceCapture);
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
          t(kpiLabel),
          t(statusLabel),
        ];
      });
      downloadExcelTable("documentary-evidence.xls", headers, rows);
      toast.success(t("Excel file downloaded."));
      return;
    }

    if (selectedTable === "Records Disposal Log") {
      if (filteredDisposal.length === 0) return;
      const headers = [
        t("Record ID"),
        t("Description"),
        t("Disposed By"),
        t("Disposal Date"),
        t("Retention Period"),
        t("Disposal Method"),
        t("Storage Media"),
      ];
      const rows = filteredDisposal.map((row) => {
        const cd = (row.capture_data && typeof row.capture_data === "object" ? row.capture_data : {}) as Record<string, unknown>;
        const va = (row.verify_archive_data && typeof row.verify_archive_data === "object" ? row.verify_archive_data : {}) as Record<string, unknown>;
        const shortId = row.id.slice(0, 4);
        const desc = String(cd.capturedData ?? "").trim().slice(0, 80) || "-";
        const disposedBy = String(row.designated_verifier_name ?? "").trim() || "-";
        const disposalDate = va.completedAt
          ? formatLocaleDate(String(va.completedAt), locale)
          : row.updated_at
            ? formatLocaleDate(row.updated_at, locale)
            : "-";
        const retention = String(va.retentionPeriod ?? "").trim() || "3 Years";
        const storageRaw = String(va.archiveLocation ?? "").trim().toLowerCase();
        const isShred = storageRaw.includes("shred") || storageRaw.includes("physical");
        const disposalMethod = isShred ? "Shred" : "Delete";
        const storage = String(va.archiveLocation ?? "").trim() || "Cloud";
        return [shortId, desc, disposedBy, disposalDate, t(retention), t(disposalMethod), t(storage)];
      });
      downloadExcelTable("records-disposal-log.xls", headers, rows);
      toast.success(t("Excel file downloaded."));
    }
  };

  const shareMasterRow = (_docRow: MasterDocumentRow, viewHref: string) => {
    const absoluteUrl =
      typeof window !== "undefined" ? new URL(viewHref, window.location.origin).toString() : viewHref;
    copyShareUrlToClipboard(absoluteUrl, t);
  };

  const copyDocumentViewLink = (recordId: string) => {
    if (!orgId) {
      toast.error(t("Could not copy link."));
      return;
    }
    const relativePath = `${createDocumentBaseHref}?recordId=${encodeURIComponent(recordId)}&mode=view`;
    const absoluteUrl =
      typeof window !== "undefined" ? new URL(relativePath, window.location.origin).toString() : relativePath;
    copyShareUrlToClipboard(absoluteUrl, t);
  };

  const copyDisposalShareLink = (recordId: string) => {
    if (!orgId) {
      toast.error(t("Could not copy link."));
      return;
    }
    const relativePath = `${getDashboardPath(orgId, "documents/documentary-evidence/verify")}?evidenceRecordId=${encodeURIComponent(recordId)}`;
    const absoluteUrl =
      typeof window !== "undefined" ? new URL(relativePath, window.location.origin).toString() : relativePath;
    copyShareUrlToClipboard(absoluteUrl, t);
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
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
                  {t("Document Management Tables")}
                </h1>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("View and manage documents across different categories")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="outline"
                className="flex items-center gap-2 border-primary text-primary hover:bg-primary/10 hover:text-primary"
              >
                <Link href={documentaryEvidenceTemplatesHref}>
                  <FileText size={16} />
                  {t("Documentary Evidence Records")}
                </Link>
              </Button>
              {myDraftId ? (
                <Button
                  asChild
                  variant="outline"
                  className="flex items-center gap-2 border-primary text-primary hover:bg-primary/10 hover:text-primary"
                >
                  <Link
                    href={`${createDocumentBaseHref}?recordId=${encodeURIComponent(myDraftId)}&mode=edit`}
                  >
                    <FileText size={16} />
                    {t("Continue Draft")}
                  </Link>
                </Button>
              ) : null}
              <Button asChild variant="default" className="flex items-center gap-2">
                <Link href={createDocumentHref}>
                  <Plus size={16} />
                  {t("Create Document")}
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
            <p className="mb-2 text-xs text-muted-foreground">{t("Select Table")}</p>
            <Select value={selectedTable} onValueChange={setSelectedTable}>
              <SelectTrigger className={cn(docSelectTrigger, "sm:min-w-[340px] sm:max-w-[520px]")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Master Document List">
                  {t("Master Document List")}
                </SelectItem>
                <SelectItem value="Obsolete Document Register">
                  {t("Obsolete Document Register")}
                </SelectItem>
                <SelectItem value="Documentary Evidence">
                  {t("Documentary Evidence (F) - Completed Form/Template - Archive")}
                </SelectItem>
                <SelectItem value="Records Disposal Log">
                  {t("Records Disposal Log (F) - Completed Form/Template")}
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
              className={cn(docAlertInfo, "text-sm")}
              role="note"
            >
              <p className={docAlertNoteTitle}>{t("Superseded versions and retention")}</p>
              <p className="mt-2 leading-relaxed">
                {t("When a")}{" "}
                <span className="font-medium">{t("new version")}</span>{" "}
                {t("of a document is created as a revision and")}{" "}
                <span className="font-medium">{t("approved")}</span>
                {t(", the previous version is moved here automatically (it stays linked to the new active record). Obsolete rows are")}{" "}
                <span className="font-medium">{t("permanently deleted")}</span> {t("once")}{" "}
                <span className="font-medium">{t("three years")}</span>{" "}
                {t("have passed since they became obsolete; cleanup runs when document lists are loaded.")}
              </p>
            </div>
          ) : null}
          {selectedTable === "Documentary Evidence" ? (
            <div
              className={cn(docAlertSuccess, "text-sm")}
              role="note"
            >
              <p className={docAlertNoteTitle}>
                {t("Captured F-type evidence records — awaiting verification")}
              </p>
              <p className="mt-2 leading-relaxed">
                {t("This table shows F-type documentary evidence records where the")}{" "}
                <span className="font-medium">{t("capture step is complete")}</span>{" "}
                {t("but verification is still pending. Once the designated verifier completes Verify & Archive, the record moves to the")}{" "}
                <span className="font-medium">{t("Records Disposal Log")}</span>.
              </p>
            </div>
          ) : null}
          {selectedTable === "Records Disposal Log" ? (
            <div
              className={cn(docAlertInfo, "text-sm")}
              role="note"
            >
              <p className={docAlertNoteTitle}>
                {t("Completed evidence records — verified & archived")}
              </p>
              <p className="mt-2 leading-relaxed">
                {t("Records appear here once")} <span className="font-medium">{t("both")}</span>{" "}
                {t("steps are finished: capture by Support Leadership and verification by the designated Top/Operational verifier. Each row shows the retention period and archive location set during verification.")}
              </p>
            </div>
          ) : null}
          {selectedTable === "Master Document List" ? (
            <div
              className="rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground"
              role="note"
            >
              <p className="leading-relaxed">
                {t("Revising an")} <span className="font-medium">{t("approved")}</span>{" "}
                {t("document creates a new version; when that new version completes approval, the prior version appears in the")}{" "}
                <span className="font-medium">{t("Obsolete Document Register")}</span>.
              </p>
            </div>
          ) : null}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {selectedTable === "Obsolete Document Register"
                  ? t("Obsolete Document Register P/F")
                  : selectedTable === "Documentary Evidence"
                    ? t("Documentary Evidence (F) - Completed Form/Template - Archive")
                    : selectedTable === "Records Disposal Log"
                      ? t("Records Disposal Log (F) - Completed Form/Template")
                      : t(selectedTable)}
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={docSearchInput}
                  placeholder={t("Search...")}
                  aria-label={t("Search")}
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
                {t("Download Excel Sheet")}
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border overflow-x-auto">
            {selectedTable === "Master Document List" ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap">
                      {t("Document Ref.")}
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap">
                      {t("Nature of Document")}
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap">{t("Title")}</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap">{t("Type")}</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap">{t("Site")}</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap">{t("Process")}</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap">{t("Standard")}</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap">{t("Clause")}</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap">{t("Subclause")}</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap">{t("Doc#")}</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap">{t("Version")}</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap">{t("Plan Date")}</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap">{t("Release Date")}</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground min-w-[140px]">
                      {t("Review Due (Lifecycle in Years)")}
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap">{t("KPI")}</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap">{t("Doc Status")}</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap">{t("Doc Position")}</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground w-[56px] text-center">
                      {t("Actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!documentsLoaded && orgId ? (
                    <TableRow>
                      <TableCell colSpan={18} className="py-12 text-center text-sm text-muted-foreground">
                        {t("Loading documents…")}
                      </TableCell>
                    </TableRow>
                  ) : filteredMaster.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={18} className="py-12 text-center text-sm text-muted-foreground">
                        {!orgId
                          ? t("Open this page from your organization dashboard to load documents.")
                          : masterApiRows.length === 0
                            ? t("No active documents yet. Use Create Document to add one.")
                            : t("No documents match your search.")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedMaster.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="text-sm font-medium text-foreground whitespace-nowrap">
                          {doc.documentRef}
                        </TableCell>
                        <TableCell className="text-sm text-foreground">{t(doc.natureOfDocument)}</TableCell>
                        <TableCell className="text-sm text-foreground max-w-[200px]">
                          {displayCell(doc.title, t)}
                        </TableCell>
                        <TableCell>
                          <span className="rounded-3xl bg-muted px-2 py-1 text-xs font-semibold text-foreground">
                            {doc.type}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{displayCell(doc.site, t)}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {displayCell(doc.process, t)}
                        </TableCell>
                        <TableCell className="text-sm">{displayCell(doc.standard, t)}</TableCell>
                        <TableCell className="text-sm max-w-[120px]">{displayCell(doc.clause, t)}</TableCell>
                        <TableCell className="text-sm max-w-[160px]">{displayCell(doc.subclause, t)}</TableCell>
                        <TableCell className="text-sm font-semibold text-foreground">
                          {displayCell(doc.docNumber, t)}
                        </TableCell>
                        <TableCell className="text-sm font-semibold text-foreground">
                          {displayCell(doc.version, t)}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {displayCell(doc.planDate, t)}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {displayCell(doc.releaseDate, t)}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {displayCell(doc.reviewDue, t)}
                        </TableCell>
                        <TableCell className="text-sm">{t(doc.kpi)}</TableCell>
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
                      title={t("Document Ref.")}
                      hint={t("(Doc/Year/Site/Process/Type/Doc#/Version)")}
                    />
                    <ObsoleteRegisterColumnHead title={t("Title")} />
                    <ObsoleteRegisterColumnHead title={t("Type")} hint={t("(P / F / EXT)")} />
                    <ObsoleteRegisterColumnHead
                      title={t("Process Owner")}
                      hint={t("(P1=Quality, P2=Manufacturing...)")}
                    />
                    <ObsoleteRegisterColumnHead title={t("Standard")} />
                    <ObsoleteRegisterColumnHead title={t("Site")} />
                    <ObsoleteRegisterColumnHead title={t("Doc#")} />
                    <ObsoleteRegisterColumnHead title={t("Version")} />
                    <ObsoleteRegisterColumnHead title={t("Obsoleted By")} />
                    <ObsoleteRegisterColumnHead title={t("Obsolete Date")} />
                    <ObsoleteRegisterColumnHead title={t("Replaced By")} hint={t("(If Any)")} />
                    <ObsoleteRegisterColumnHead title={t("Archived Location")} />
                    <TableHead className="w-14 px-3 py-2.5 text-center text-xs font-semibold text-foreground first:pl-4 last:pr-4">
                      {t("Actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!documentsLoaded && orgId ? (
                    <TableRow>
                      <TableCell colSpan={13} className="py-12 text-center text-sm text-muted-foreground">
                        {t("Loading…")}
                      </TableCell>
                    </TableRow>
                  ) : filteredObsolete.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} className="py-12 text-center text-sm text-muted-foreground">
                        {!orgId
                          ? t("Open this page from your organization dashboard to load documents.")
                          : obsoleteApiRows.length === 0
                            ? t("No obsolete documents. Superseded versions appear here after a new revision is approved.")
                            : t("No obsolete documents match your search.")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedObsolete.map((row) => (
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
                      title={t("Document Ref.")}
                      hint={t("(Doc/Year/Site/Process/Type/Doc#/Version)")}
                    />
                    <ObsoleteRegisterColumnHead title={t("Title")} />
                    <ObsoleteRegisterColumnHead
                      title={t("Process Owner")}
                      hint={t("(P1=Quality, P2=Manufacturing...)")}
                    />
                    <ObsoleteRegisterColumnHead title={t("Batch/Lot#")} />
                    <ObsoleteRegisterColumnHead title={t("Year/Month")} />
                    <ObsoleteRegisterColumnHead title={t("Site")} />
                    <ObsoleteRegisterColumnHead title={t("Doc#")} />
                    <ObsoleteRegisterColumnHead title={t("Version")} />
                    <ObsoleteRegisterColumnHead title={t("Capture By")} />
                    <ObsoleteRegisterColumnHead title={t("Capture Date")} />
                    <ObsoleteRegisterColumnHead title={t("Verify By")} />
                    <ObsoleteRegisterColumnHead title={t("Verify Date")} />
                    <ObsoleteRegisterColumnHead
                      align="center"
                      title={t("KPI")}
                      hint={t("≤30d Green · >30d Yellow · >40d Red")}
                    />
                    <ObsoleteRegisterColumnHead
                      align="center"
                      title={t("Record Status")}
                      hint={t("Success / Pending / Fail")}
                    />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!evidenceLoaded ? (
                    <TableRow>
                      <TableCell colSpan={14} className="py-12 text-center text-sm text-muted-foreground">
                        {t("Loading evidence records…")}
                      </TableCell>
                    </TableRow>
                  ) : filteredEvidence.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={14} className="py-12 text-center text-sm text-muted-foreground">
                        {evidenceCapturedOnly.length === 0
                          ? t("No documentary evidence records loaded yet. This view will use captured F-type records when the API is connected.")
                          : t("No records match your search.")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedEvidence.map((row) => {
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
                        ? formatLocaleDate(captureDateObj, locale)
                        : "-";
                      const verifyBy = String(row.designated_verifier_name ?? "").trim() || "-";
                      const verifyDate = va.completedAt
                        ? formatLocaleDate(String(va.completedAt), locale)
                        : "-";
                      const daysSinceCapture = captureDateObj ? getDaysSince(captureDateObj) : 0;
                      const { kpiLabel, statusLabel, kpiColorClass: kpiColor, statusBadgeClass: statusBg } =
                        getComplianceKpiFromDays(daysSinceCapture);

                      return (
                        <TableRow key={row.id} className="border-b border-border hover:bg-muted/20">
                          <TableCell className="px-3 py-2.5 text-sm font-medium text-foreground whitespace-nowrap">
                            {displayCell(ref, t)}
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-foreground max-w-[180px]">
                            {displayCell(title, t)}
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-foreground">
                            {displayCell(processOwner, t)}
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-foreground">
                            {displayCell(batch, t)}
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-foreground whitespace-nowrap">
                            {displayCell(yearMonth, t)}
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-foreground">
                            {displayCell(site, t)}
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-sm font-bold text-foreground">
                            {displayCell(docNum, t)}
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-foreground">
                            {displayCell(version, t)}
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-foreground">
                            {displayCell(captureBy, t)}
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-foreground whitespace-nowrap">
                            {displayCell(captureDate, t)}
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-foreground">
                            {displayCell(verifyBy, t)}
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-foreground whitespace-nowrap">
                            {displayCell(verifyDate, t)}
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-center">
                            <span className={cn("text-sm font-semibold", kpiColor)}>{t(kpiLabel)}</span>
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-center">
                            <span
                              className={cn(
                                "inline-block rounded-md px-3 py-1 text-xs font-semibold",
                                statusBg,
                                complianceStatusTextClass(statusLabel)
                              )}
                            >
                              {t(statusLabel)}
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
                    <ObsoleteRegisterColumnHead title={t("Record ID")} />
                    <ObsoleteRegisterColumnHead title={t("Description")} />
                    <ObsoleteRegisterColumnHead title={t("Disposed By")} />
                    <ObsoleteRegisterColumnHead title={t("Disposal Date")} />
                    <ObsoleteRegisterColumnHead
                      title={t("Retention Period")}
                      hint={t("(1Y / 2Y / 3Y / Legal / Lifetime)")}
                    />
                    <ObsoleteRegisterColumnHead title={t("Disposal Method")} hint={t("(Delete / Shred)")} />
                    <ObsoleteRegisterColumnHead
                      title={t("Storage Media")}
                      hint={t("(Cloud / Physical / Local Server)")}
                    />
                    <ObsoleteRegisterColumnHead
                      align="center"
                      title={t("Actions")}
                      hint={t("(View / Share / Download)")}
                    />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!evidenceLoaded ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                        {t("Loading disposal records…")}
                      </TableCell>
                    </TableRow>
                  ) : filteredDisposal.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                        {evidenceCompletedOnly.length === 0
                          ? t("No disposal log entries yet. This view will list disposed records when the API is connected.")
                          : t("No records match your search.")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedDisposal.map((row) => {
                      const cd = (row.capture_data && typeof row.capture_data === "object" ? row.capture_data : {}) as Record<string, unknown>;
                      const va = (row.verify_archive_data && typeof row.verify_archive_data === "object" ? row.verify_archive_data : {}) as Record<string, unknown>;
                      const shortId = row.id.slice(0, 4);
                      const desc = String(cd.capturedData ?? "").trim().slice(0, 80) || "-";
                      const disposedBy = String(row.designated_verifier_name ?? "").trim() || "-";
                      const disposalDate = va.completedAt
                        ? formatLocaleDate(String(va.completedAt), locale)
                        : row.updated_at
                          ? formatLocaleDate(row.updated_at, locale)
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
                          <TableCell className="px-3 py-2.5 text-sm text-foreground max-w-[220px]">
                            {displayCell(desc, t)}
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-foreground">
                            {displayCell(disposedBy, t)}
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-foreground whitespace-nowrap">
                            {displayCell(disposalDate, t)}
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-foreground">{t(retention)}</TableCell>
                          <TableCell className="px-3 py-2.5">
                            <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", disposalMethodColor)}>
                              <Scissors className="h-3 w-3" />
                              {t(disposalMethod)}
                            </span>
                          </TableCell>
                          <TableCell className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
                              <StorageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              {t(storage)}
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
                                <DropdownMenuLabel className="text-xs text-muted-foreground">{t("Actions")}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="gap-2 text-sm">
                                  <Eye className="h-4 w-4" /> {t("View")}
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                                  <button
                                    type="button"
                                    className="relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none select-none focus:bg-accent focus:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
                                    onClick={() => copyDisposalShareLink(row.id)}
                                  >
                                    <Share2 className="h-4 w-4" /> {t("Share")}
                                  </button>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 text-sm">
                                  <FileDown className="h-4 w-4" /> {t("Download PDF")}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 text-sm">
                                  <FileSpreadsheet className="h-4 w-4" /> {t("Download Excel")}
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
                  <TableRow className="border-b border-border bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap">
                      {t("Document Ref.")}
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap">
                      {t("Nature of Document")}
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap">{t("Title")}</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap">{t("Type")}</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap">{t("Site")}</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap">{t("Process")}</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap">{t("Standard")}</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap">{t("Clause")}</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap">{t("Subclause")}</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap">{t("Doc#")}</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap">{t("Version")}</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap">{t("Plan Date")}</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap">{t("Release Date")}</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground whitespace-nowrap">{t("Review Due")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!documentsLoaded && orgId ? (
                    <TableRow>
                      <TableCell colSpan={13} className="py-12 text-center text-sm text-muted-foreground">
                        {t("Loading documents…")}
                      </TableCell>
                    </TableRow>
                  ) : filteredMaster.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} className="py-12 text-center text-sm text-muted-foreground">
                        {!orgId
                          ? t("Open this page from your organization dashboard to load documents.")
                          : masterApiRows.length === 0
                            ? t("No active documents yet.")
                            : t("No documents match your search.")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedMaster.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium text-foreground">{doc.documentRef}</TableCell>
                        <TableCell>{t(doc.natureOfDocument)}</TableCell>
                        <TableCell>{displayCell(doc.title, t)}</TableCell>
                        <TableCell>
                          <span className="rounded-3xl bg-muted px-2 py-1 text-xs font-semibold">
                            {doc.type}
                          </span>
                        </TableCell>
                        <TableCell>{displayCell(doc.site, t)}</TableCell>
                        <TableCell>{displayCell(doc.process, t)}</TableCell>
                        <TableCell>{displayCell(doc.standard, t)}</TableCell>
                        <TableCell>{displayCell(doc.clause, t)}</TableCell>
                        <TableCell>{displayCell(doc.subclause, t)}</TableCell>
                        <TableCell className="font-semibold">{displayCell(doc.docNumber, t)}</TableCell>
                        <TableCell className="font-semibold">{displayCell(doc.version, t)}</TableCell>
                        <TableCell>{displayCell(doc.planDate, t)}</TableCell>
                        <TableCell>{displayCell(doc.releaseDate, t)}</TableCell>
                        <TableCell>{displayCell(doc.reviewDue, t)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>

          <TablePagination
            page={tablePage}
            total={activeTableRowCount}
            onPageChange={setTablePage}
          />

          {/* Action strip (purely visual until backend exists) */}
          {/* <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Button variant="outline" className="flex items-center gap-2">
              <Upload size={16} />
              {t("Upload")}
            </Button>
          </div> */}
        </CardContent>
      </Card>

      {selectedTable === "Records Disposal Log" ? <KpiStatusLogicCard /> : null}

      {/* Document Classification */}
      <Card>
        <CardContent className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">
            {t("Document Classification")}
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                {t("Category 1 - Maintained Documents")}{" "}
                <span className="text-primary">{t("(Type P)")}</span>
              </h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>{t("Policy")}</div>
                <div>{t("Procedure")}</div>
                <div>{t("SOP")}</div>
                <div>{t("Work Instruction")}</div>
                <div>
                  <span className="font-medium text-foreground">{t("Lifecycle:")}</span>{" "}
                  {t("Draft → Create → Review → Approve → Obsolete")}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                {t("Category 2 - Retained Records")}{" "}
                <span className="text-primary">{t("(Type F)")}</span>
              </h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>{t("Templates")}</div>
                <div>{t("Forms")}</div>
                <div>{t("Checklists")}</div>
                <div>
                  <span className="font-medium text-foreground">{t("Lifecycle:")}</span>{" "}
                  {t("Draft + Capture → Verify & Archive → Dispose")}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
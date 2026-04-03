"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, FileText, PlayCircle, Search } from "lucide-react";
import { getDashboardPath } from "@/lib/subdomain";

type DocumentsApiRecord = {
  id: string;
  status: "draft" | "submitted";
  preview_doc_ref: string;
  form_data: Record<string, unknown> | null;
  wizard_data: Record<string, unknown> | null;
};

type FRecordTemplate = {
  recordId: string;
  referenceNumber: string;
  formTitle: string;
  site: string;
  process: string;
  standard: string;
  clause: string;
  subclause: string;
  version: string;
};

function pickVersion(documentRef: string): string {
  const parts = documentRef.split("/").filter(Boolean);
  if (parts.length < 1) return "-";
  return parts[parts.length - 1] ?? "-";
}

function isFTypeDocument(row: DocumentsApiRecord): boolean {
  const formData = (row.form_data ?? {}) as Record<string, unknown>;
  const wizard = (row.wizard_data ?? {}) as Record<string, unknown>;
  const t = String(wizard.documentClassification ?? formData.docType ?? "")
    .trim()
    .toUpperCase();
  return t === "F";
}

function mapRecordToTemplate(row: DocumentsApiRecord): FRecordTemplate {
  const formData = (row.form_data ?? {}) as Record<string, unknown>;
  const documentRef = String(row.preview_doc_ref ?? "").trim() || "-";
  return {
    recordId: row.id,
    referenceNumber: documentRef,
    formTitle: String(formData.title ?? "").trim() || "-",
    site: String(formData.siteId ?? formData.site ?? "").trim() || "-",
    process: String(formData.processName ?? formData.processId ?? "").trim() || "-",
    standard: String(formData.managementStandard ?? "").trim() || "-",
    clause: String(formData.clause ?? "").trim() || "-",
    subclause: String(formData.subClause ?? "").trim() || "-",
    version: pickVersion(documentRef),
  };
}

export default function DocumentaryEvidenceTemplatesContent() {
  const params = useParams();
  const orgId = (params?.orgId as string) || "";
  const documentsHref = orgId ? getDashboardPath(orgId, "documents") : "/";
  const createHref = orgId ? getDashboardPath(orgId, "documents/create") : "/";
  const captureHref = orgId ? getDashboardPath(orgId, "documents/documentary-evidence/capture") : "/";

  const [search, setSearch] = useState("");
  const [templates, setTemplates] = useState<FRecordTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!orgId) {
        setTemplates([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const res = await fetch(`/api/organization/${orgId}/documents?lifecycle=active`, {
          credentials: "include",
        });
        const json = res.ok ? await res.json() : { records: [] };
        if (ignore) return;
        const records = Array.isArray(json?.records) ? (json.records as DocumentsApiRecord[]) : [];
        const fOnly = records.filter((r) => isFTypeDocument(r));
        setTemplates(fOnly.map(mapRecordToTemplate));
      } catch {
        if (!ignore) setTemplates([]);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, [orgId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((row) => {
      const haystack = [
        row.referenceNumber,
        row.formTitle,
        row.site,
        row.process,
        row.standard,
        row.clause,
        row.subclause,
        row.version,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [search, templates]);

  const emptyMessage = isLoading
    ? "Loading templates…"
    : templates.length === 0
      ? "No F-type (Form) documents found in the active Master Document List. Create an F document from Documents, then it will appear here."
      : "No templates match your search.";

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link
              href={documentsHref}
              className="text-foreground hover:text-[#6366F1] hover:underline"
            >
              Documents
            </Link>
          </li>
          <li aria-hidden className="text-muted-foreground">
            /
          </li>
          <li className="font-medium text-foreground">Documentary Evidence Records</li>
        </ol>
      </nav>

      {/* Title */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">
          Documentary Evidence Record Templates
        </h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Select an approved F-type template from the Master Document List to begin capturing a new
          evidence record.
        </p>
      </div>

      {/* How it works */}
      <div
        className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-sm text-[#1E3A5F]"
        role="note"
      >
        <p className="font-semibold text-[#1E40AF]">How it works</p>
        <p className="mt-2 leading-relaxed">
          These are approved <span className="font-medium">F-type (Retained Record)</span> forms from
          your master list. Choosing <span className="font-medium">Start Capture</span> opens the
          capture flow for that template. The record lifecycle is:{" "}
          <span className="font-medium">
            Draft → Capture → Verify → Archive → Dispose
          </span>
          . New templates are not created here — use{" "}
          <Link
            href={createHref}
            className="font-medium text-[#2563EB] underline-offset-2 hover:underline"
          >
            Create Document
          </Link>{" "}
          to add approved forms to the Master Document List first.
        </p>
      </div>

      {/* Templates table card */}
      <Card className="border border-[#0000001A] shadow-sm">
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-[#0A0A0A]">
              Available F-Record Templates
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({isLoading ? "…" : filtered.length} active F-type)
              </span>
            </h2>
            <div className="relative w-full sm:w-[280px]">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates..."
                disabled={isLoading || templates.length === 0}
                className="h-10 pl-9 bg-[#F9FAFB] border-[#E5E7EB]"
              />
            </div>
          </div>

          <div className="rounded-lg border border-[#E5E7EB] overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/50 hover:bg-muted/50">
                  <TableHead className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Reference number
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Form title
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Site
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Process
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Standard
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Clause
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Subclause
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Version
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-right min-w-[140px]">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      {emptyMessage}
                    </TableCell>
                  </TableRow>
                ) : null}
                {filtered.map((row) => (
                  <TableRow
                    key={row.recordId}
                    className="border-b border-border bg-background hover:bg-muted/20"
                  >
                    <TableCell className="text-sm font-medium text-foreground whitespace-nowrap">
                      {row.referenceNumber}
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-[#0A0A0A] max-w-[200px]">
                      {row.formTitle}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-foreground">{row.site}</TableCell>
                    <TableCell className="text-sm font-medium text-foreground">{row.process}</TableCell>
                    <TableCell className="text-sm font-medium text-foreground">{row.standard}</TableCell>
                    <TableCell className="text-sm text-foreground max-w-[140px]">{row.clause}</TableCell>
                    <TableCell className="text-sm text-foreground max-w-[180px]">
                      {row.subclause}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="rounded-md border-[#E5E7EB] bg-[#F3F4F6] px-2 py-0.5 text-xs font-medium text-[#4B5563]"
                      >
                        {row.version}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200/80">
                        <Check className="size-3.5 shrink-0" aria-hidden />
                        Active
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        className="gap-2 bg-[#22B323] text-white hover:bg-[#1a9825] shadow-sm"
                        asChild
                      >
                        <Link
                          href={`${captureHref}?template=${encodeURIComponent(row.referenceNumber)}&recordId=${encodeURIComponent(row.recordId)}`}
                        >
                          <PlayCircle className="size-4 shrink-0" />
                          Start Capture
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Footer note */}
      <div
        className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        role="note"
      >
        <p className="leading-relaxed">
          Captured evidence aligns with <span className="font-semibold">ISO 9001:2015 Clause 7.5.3</span>{" "}
          (Control of documented information). Each submission receives a unique Record ID (e.g.{" "}
          <span className="font-mono font-medium">REC-000124</span>). Completed records appear in the{" "}
          <span className="font-semibold">Documentary Evidence</span> table; disposal is tracked in the{" "}
          <span className="font-semibold">Records Disposal Log</span>.
        </p>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" asChild>
          <Link href={documentsHref}>
            <FileText className="size-4 mr-2" />
            Back to document tables
          </Link>
        </Button>
      </div>
    </div>
  );
}

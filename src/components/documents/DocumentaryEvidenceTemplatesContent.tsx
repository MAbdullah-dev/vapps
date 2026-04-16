"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Archive, Check, Eye, FileText, Pencil, PlayCircle, Search, ShieldCheck } from "lucide-react";
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
import { getDashboardPath } from "@/lib/subdomain";
import {
  canViewDocumentaryEvidenceWorkflow,
  isSupportLeadershipTier,
  isTopOrOperationalLeadershipTier,
} from "@/lib/documentaryEvidenceAccess";

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

type EvidenceApiRow = {
  id?: string;
  template_record_id?: string;
  workflow_status?: string;
  designated_verifier_user_id?: string;
  updated_at?: string;
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

function pickLatestEvidenceByTemplate(rows: EvidenceApiRow[]): Map<string, EvidenceApiRow> {
  const m = new Map<string, EvidenceApiRow>();
  for (const raw of rows) {
    const tid = String(raw.template_record_id ?? "").trim();
    if (!tid) continue;
    const prev = m.get(tid);
    const prevTs = prev?.updated_at ? Date.parse(String(prev.updated_at)) : -Infinity;
    const curTs = raw.updated_at ? Date.parse(String(raw.updated_at)) : 0;
    if (!prev || curTs >= prevTs) m.set(tid, raw);
  }
  return m;
}

function workflowStatusLabel(ws: string | undefined): { label: string; className: string } {
  const s = String(ws ?? "").trim();
  if (!s)
    return { label: "—", className: "bg-slate-50 text-slate-600 ring-slate-200/80" };
  if (s === "draft")
    return { label: "Capture", className: "bg-amber-50 text-amber-900 ring-amber-200/80" };
  if (s === "capture_submitted")
    return { label: "Verify", className: "bg-sky-50 text-sky-900 ring-sky-200/80" };
  if (s === "completed")
    return { label: "Active", className: "bg-emerald-50 text-emerald-800 ring-emerald-200/80" };
  return { label: s, className: "bg-slate-50 text-slate-700 ring-slate-200/80" };
}

export default function DocumentaryEvidenceTemplatesContent() {
  const params = useParams();
  const orgId = (params?.orgId as string) || "";
  const documentsHref = orgId ? getDashboardPath(orgId, "documents") : "/";
  const createHref = orgId ? getDashboardPath(orgId, "documents/create") : "/";
  const captureHref = orgId ? getDashboardPath(orgId, "documents/documentary-evidence/capture") : "/";
  const verifyHref = orgId ? getDashboardPath(orgId, "documents/documentary-evidence/verify") : "/";

  const [search, setSearch] = useState("");
  const [templates, setTemplates] = useState<FRecordTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [meLoaded, setMeLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [leadershipTier, setLeadershipTier] = useState<string | undefined>(undefined);
  const [evidenceRows, setEvidenceRows] = useState<EvidenceApiRow[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(true);

  const canSeeWorkflow = canViewDocumentaryEvidenceWorkflow(leadershipTier);
  const isSupport = isSupportLeadershipTier(leadershipTier);
  const isVerifierTier = isTopOrOperationalLeadershipTier(leadershipTier);

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

  useEffect(() => {
    let ignore = false;
    async function loadMe() {
      if (!orgId) {
        if (!ignore) {
          setUserId(null);
          setLeadershipTier(undefined);
          setMeLoaded(true);
        }
        return;
      }
      try {
        const res = await fetch(`/api/organization/${orgId}/me`, { credentials: "include" });
        const j = res.ok ? await res.json() : {};
        if (!ignore) {
          setUserId(typeof j.userId === "string" ? j.userId : null);
          setLeadershipTier(typeof j.leadershipTier === "string" ? j.leadershipTier : undefined);
        }
      } catch {
        if (!ignore) {
          setUserId(null);
          setLeadershipTier(undefined);
        }
      } finally {
        if (!ignore) setMeLoaded(true);
      }
    }
    void loadMe();
    return () => {
      ignore = true;
    };
  }, [orgId]);

  useEffect(() => {
    let ignore = false;
    async function loadEvidence() {
      if (!orgId || !canSeeWorkflow) {
        if (!ignore) {
          setEvidenceRows([]);
          setEvidenceLoading(false);
        }
        return;
      }
      setEvidenceLoading(true);
      try {
        const res = await fetch(`/api/organization/${orgId}/documentary-evidence-records`, {
          credentials: "include",
        });
        const j = (await res.json().catch(() => ({}))) as { records?: EvidenceApiRow[] };
        if (!ignore) setEvidenceRows(res.ok && Array.isArray(j.records) ? j.records : []);
      } catch {
        if (!ignore) setEvidenceRows([]);
      } finally {
        if (!ignore) setEvidenceLoading(false);
      }
    }
    void loadEvidence();
    return () => {
      ignore = true;
    };
  }, [orgId, canSeeWorkflow, leadershipTier]);

  const latestByTemplate = useMemo(() => pickLatestEvidenceByTemplate(evidenceRows), [evidenceRows]);

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

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">
          Documentary Evidence Record Templates
        </h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Select an approved F-type template from the Master Document List to begin capturing a new evidence record.
          Status reflects the latest evidence workflow for that template (Capture → Verify → Active).
        </p>
      </div>

      <div
        className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-sm text-[#1E3A5F]"
        role="note"
      >
        <p className="font-semibold text-[#1E40AF]">How it works</p>
        <p className="mt-2 leading-relaxed">
          These are approved <span className="font-medium">F-type (Retained Record)</span> forms from your master list.
          <span className="font-medium"> Support Leadership</span> runs capture; the{" "}
          <span className="font-medium">designated Top/Operational verifier</span> completes Verify &amp; Archive. When
          verification finishes, status becomes <span className="font-medium">Active</span>. New templates are added via{" "}
          <Link
            href={createHref}
            className="font-medium text-[#2563EB] underline-offset-2 hover:underline"
          >
            Create Document
          </Link>
          .
        </p>
      </div>

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
                    Evidence status
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-right min-w-[200px]">
                    Actions
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
                {filtered.map((row) => {
                  const latest = canSeeWorkflow ? latestByTemplate.get(row.recordId) : undefined;
                  const ws = String(latest?.workflow_status ?? "").trim();
                  const evId = String(latest?.id ?? "").trim();
                  const designatedId = String(latest?.designated_verifier_user_id ?? "").trim();
                  const isDesignatedVerifier = Boolean(userId && designatedId && userId === designatedId);
                  const st = workflowStatusLabel(ws);

                  const startCaptureUrl = `${captureHref}?template=${encodeURIComponent(row.referenceNumber)}&recordId=${encodeURIComponent(row.recordId)}`;
                  const continueCaptureUrl = `${captureHref}?template=${encodeURIComponent(row.referenceNumber)}&recordId=${encodeURIComponent(row.recordId)}&evidenceRecordId=${encodeURIComponent(evId)}`;
                  const viewCaptureUrl = `${captureHref}?template=${encodeURIComponent(row.referenceNumber)}&recordId=${encodeURIComponent(row.recordId)}&evidenceRecordId=${encodeURIComponent(evId)}&mode=view`;
                  const verifyUrl = `${verifyHref}?template=${encodeURIComponent(row.referenceNumber)}&recordId=${encodeURIComponent(row.recordId)}&evidenceRecordId=${encodeURIComponent(evId)}`;

                  return (
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
                        {!meLoaded || (canSeeWorkflow && evidenceLoading) ? (
                          <span className="text-xs text-muted-foreground">…</span>
                        ) : canSeeWorkflow ? (
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${st.className}`}
                          >
                            {ws === "completed" ? (
                              <Check className="size-3.5 shrink-0" aria-hidden />
                            ) : null}
                            {st.label}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          {!meLoaded ? (
                            <span className="text-xs text-muted-foreground">Checking access…</span>
                          ) : !canSeeWorkflow ? (
                            <span className="text-[10px] text-muted-foreground max-w-[160px] text-right leading-tight">
                              Leadership access required for workflow actions
                            </span>
                          ) : evidenceLoading ? (
                            <span className="text-xs text-muted-foreground">Loading actions…</span>
                          ) : (
                            <>
                              {/* No evidence yet — Support starts capture */}
                              {!latest && isSupport ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  className="gap-2 bg-[#22B323] text-white hover:bg-[#1a9825] shadow-sm"
                                  asChild
                                >
                                  <Link href={startCaptureUrl}>
                                    <PlayCircle className="size-4 shrink-0" />
                                    Start capture
                                  </Link>
                                </Button>
                              ) : null}

                              {/* Draft — Support can EDIT (continue) the draft */}
                              {latest && ws === "draft" && isSupport ? (
                                <Button type="button" size="sm" className="gap-2 bg-amber-600 text-white hover:bg-amber-700 shadow-sm" asChild>
                                  <Link href={continueCaptureUrl}>
                                    <Pencil className="size-4 shrink-0" />
                                    Edit capture
                                  </Link>
                                </Button>
                              ) : null}

                              {/* Submitted — NO capture/edit buttons. Support can only view (read-only); designated verifier verifies */}
                              {latest && ws === "capture_submitted" ? (
                                <>
                                  {isSupport ? (
                                    <Button type="button" size="sm" variant="outline" className="gap-2" asChild>
                                      <Link href={viewCaptureUrl}>
                                        <Eye className="size-4 shrink-0" />
                                        View capture
                                      </Link>
                                    </Button>
                                  ) : null}
                                  {isVerifierTier && isDesignatedVerifier ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="gap-2 bg-[#1E3A8A] text-white hover:bg-[#1E40AF]"
                                      asChild
                                    >
                                      <Link href={verifyUrl}>
                                        <ShieldCheck className="size-4 shrink-0" />
                                        Verify &amp; archive
                                      </Link>
                                    </Button>
                                  ) : null}
                                </>
                              ) : null}

                              {/* Completed — view active record; Support can start a NEW capture */}
                              {latest && ws === "completed" ? (
                                <>
                                  {(isSupport || isVerifierTier) && (
                                    <Button type="button" size="sm" variant="outline" className="gap-2" asChild>
                                      <Link href={verifyUrl}>
                                        <Archive className="size-4 shrink-0" />
                                        View record
                                      </Link>
                                    </Button>
                                  )}
                                  {isSupport ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="gap-2 bg-[#22B323] text-white hover:bg-[#1a9825] shadow-sm"
                                      asChild
                                    >
                                      <Link href={startCaptureUrl}>
                                        <PlayCircle className="size-4 shrink-0" />
                                        Start new capture
                                      </Link>
                                    </Button>
                                  ) : null}
                                </>
                              ) : null}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div
        className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        role="note"
      >
        <p className="leading-relaxed">
          Captured evidence aligns with <span className="font-semibold">ISO 9001:2015 Clause 7.5.3</span> (Control of
          documented information). Completed records show <span className="font-semibold">Active</span> after the
          designated verifier finishes Verify &amp; Archive.
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

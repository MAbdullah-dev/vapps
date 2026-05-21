"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDashboardPath } from "@/lib/subdomain";
import {
  isSupportLeadershipTier,
  isTopOrOperationalLeadershipTier,
} from "@/lib/documentaryEvidenceAccess";
import CaptureEvidenceStep from "@/components/documents/steps/CaptureEvidenceStep";
import {
  docEvidenceStepCurrent,
  docEvidenceStepIconCurrent,
} from "@/lib/document-ui-classes";

type EvidenceRow = {
  workflow_status?: string;
  capture_data?: Record<string, unknown>;
  designated_verifier_user_id?: string;
  designated_verifier_name?: string;
};

type DocumentRow = {
  wizard_data?: Record<string, unknown>;
};

function parseCaptureData(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  if (typeof v === "string" && v.trim()) {
    try {
      const p = JSON.parse(v) as unknown;
      if (p && typeof p === "object" && !Array.isArray(p)) return p as Record<string, unknown>;
    } catch {
      /* ignore */
    }
  }
  return {};
}

export default function DocumentaryEvidenceCaptureContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = (params?.orgId as string) || "";
  const documentsHref = orgId ? getDashboardPath(orgId, "documents") : "/";
  const recordsHref = orgId ? getDashboardPath(orgId, "documents/documentary-evidence") : "/";
  const templateRef = searchParams.get("template") || "Doc/2025/S1/P1/P/D1/v1";
  const templateRecordId = searchParams.get("recordId")?.trim() ?? "";
  const evidenceFromUrl = searchParams.get("evidenceRecordId")?.trim() ?? "";
  const mode = searchParams.get("mode")?.trim().toLowerCase() ?? "";

  const [evidenceRecordId, setEvidenceRecordId] = useState<string | null>(evidenceFromUrl || null);
  const [evidenceRow, setEvidenceRow] = useState<EvidenceRow | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(Boolean(evidenceFromUrl));
  const [templateEditorContent, setTemplateEditorContent] = useState("");

  const [meReady, setMeReady] = useState(false);
  const [leadershipTier, setLeadershipTier] = useState<string | undefined>(undefined);

  const isSupport = isSupportLeadershipTier(leadershipTier);
  const isVerifierTier = isTopOrOperationalLeadershipTier(leadershipTier);

  useEffect(() => {
    setEvidenceRecordId(evidenceFromUrl || null);
  }, [evidenceFromUrl]);

  useEffect(() => {
    let ignore = false;
    async function loadMe() {
      if (!orgId) {
        if (!ignore) {
          setLeadershipTier(undefined);
          setMeReady(true);
        }
        return;
      }
      try {
        const res = await fetch(`/api/organization/${orgId}/me`, { credentials: "include" });
        const j = res.ok ? await res.json() : {};
        if (!ignore) setLeadershipTier(typeof j.leadershipTier === "string" ? j.leadershipTier : undefined);
      } catch {
        if (!ignore) setLeadershipTier(undefined);
      } finally {
        if (!ignore) setMeReady(true);
      }
    }
    void loadMe();
    return () => {
      ignore = true;
    };
  }, [orgId]);

  useEffect(() => {
    let ignore = false;
    async function loadEv() {
      if (!orgId || !evidenceFromUrl) {
        if (!ignore) {
          setEvidenceLoading(false);
          setEvidenceRow(null);
        }
        return;
      }
      setEvidenceLoading(true);
      try {
        const res = await fetch(
          `/api/organization/${orgId}/documentary-evidence-records?id=${encodeURIComponent(evidenceFromUrl)}`,
          { credentials: "include" }
        );
        const j = (await res.json().catch(() => ({}))) as { records?: EvidenceRow[] };
        const row = res.ok && Array.isArray(j.records) && j.records[0] ? j.records[0] : null;
        if (!ignore) setEvidenceRow(row);
      } catch {
        if (!ignore) setEvidenceRow(null);
      } finally {
        if (!ignore) setEvidenceLoading(false);
      }
    }
    void loadEv();
    return () => {
      ignore = true;
    };
  }, [orgId, evidenceFromUrl]);

  useEffect(() => {
    let ignore = false;
    async function loadTemplateDocumentContent() {
      if (!orgId || !templateRecordId) {
        if (!ignore) setTemplateEditorContent("");
        return;
      }
      try {
        const res = await fetch(
          `/api/organization/${orgId}/documents?id=${encodeURIComponent(templateRecordId)}`,
          { credentials: "include" }
        );
        const j = (await res.json().catch(() => ({}))) as { records?: DocumentRow[] };
        const row = res.ok && Array.isArray(j.records) && j.records[0] ? j.records[0] : null;
        const wizard =
          row?.wizard_data && typeof row.wizard_data === "object" && !Array.isArray(row.wizard_data)
            ? row.wizard_data
            : {};
        const editorContent =
          typeof wizard.documentEditorContent === "string" ? wizard.documentEditorContent : "";
        if (!ignore) setTemplateEditorContent(editorContent);
      } catch {
        if (!ignore) setTemplateEditorContent("");
      }
    }
    void loadTemplateDocumentContent();
    return () => {
      ignore = true;
    };
  }, [orgId, templateRecordId]);

  const workflow = String(evidenceRow?.workflow_status ?? "").trim();

  const readOnly = Boolean(
    mode === "view" ||
      workflow === "capture_submitted" ||
      workflow === "completed" ||
      (!isSupport && isVerifierTier)
  );

  const canUseCapturePage =
    isSupport || (isVerifierTier && mode === "view" && Boolean(evidenceFromUrl) && !evidenceLoading);

  const serverCapture = evidenceRow ? parseCaptureData(evidenceRow.capture_data) : null;
  const serverDesignatedVerifierUserId = String(evidenceRow?.designated_verifier_user_id ?? "").trim() || undefined;
  const serverDesignatedVerifierName = String(evidenceRow?.designated_verifier_name ?? "").trim() || undefined;

  const handleCaptureSubmit = useCallback(() => {
    router.push(recordsHref);
  }, [router, recordsHref]);

  if (!meReady || (Boolean(evidenceFromUrl) && evidenceLoading)) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-xl border border-border bg-muted/30 px-6 py-16">
        <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
        <p className="text-sm font-medium text-foreground">Loading…</p>
      </div>
    );
  }

  if (!canUseCapturePage) {
    return (
      <div className="space-y-6">
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardContent className="py-10 text-center space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Capture is restricted</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Only <span className="font-medium">Support Leadership</span> can enter and edit capture data. Top and
              Operational leadership can open capture from the templates table in <span className="font-medium">view</span>{" "}
              mode after submission.
            </p>
            <Button asChild variant="outline" className="mt-2">
              <Link href={recordsHref}>Back to templates</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border border-border py-4">
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-[36px] leading-tight font-bold text-foreground">Documentary Evidence Records</h2>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href={documentsHref}>Exit to Dashboard</Link>
              </Button>
            </div>
          </div>

          {readOnly ? (
            <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground">
              <span className="font-semibold">View only.</span> Capture has been submitted or completed; fields cannot be
              edited here.
            </div>
          ) : null}

          <div className="max-w-md">
            <div className={docEvidenceStepCurrent} aria-current="step">
              <span className={docEvidenceStepIconCurrent}>
                <FileText size={15} className="text-primary-foreground" />
              </span>
              <span className="text-xs font-medium text-center leading-snug">Capture</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <nav aria-label="Breadcrumb" className="text-sm">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href={documentsHref} className="text-muted-foreground hover:text-foreground">
              Documents
            </Link>
          </li>
          <li className="text-muted-foreground/70">›</li>
          <li>
            <Link href={recordsHref} className="text-muted-foreground hover:text-foreground">
              Documentary Evidence Records
            </Link>
          </li>
          <li className="text-muted-foreground/70">›</li>
          <li className="font-semibold text-foreground">{readOnly ? "View capture" : "Capture"}</li>
        </ol>
      </nav>

      <CaptureEvidenceStep
        orgId={orgId}
        templateRecordId={templateRecordId}
        templateRef={templateRef}
        templatesHref={recordsHref}
        evidenceRecordId={evidenceRecordId}
        onEvidenceRecordIdChange={(id) => setEvidenceRecordId(id)}
        onSubmit={handleCaptureSubmit}
        readOnly={readOnly}
        serverCapture={serverCapture}
        serverTemplateDocumentEditorContent={templateEditorContent}
        serverDesignatedVerifierUserId={serverDesignatedVerifierUserId}
        serverDesignatedVerifierName={serverDesignatedVerifierName}
      />
    </div>
  );
}

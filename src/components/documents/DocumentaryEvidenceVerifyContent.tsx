"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDashboardPath } from "@/lib/subdomain";
import {
  canViewDocumentaryEvidenceWorkflow,
  isTopOrOperationalLeadershipTier,
} from "@/lib/documentaryEvidenceAccess";
import VerifyArchiveEvidenceStep, {
  type DesignatedVerifier,
} from "@/components/documents/steps/VerifyArchiveEvidenceStep";
import type { EvidencePdfData } from "@/lib/generateDocumentaryEvidencePdf";
import { compactSiteCode, compactSiteCodeInDocumentRef } from "@/lib/documentRef";
import {
  buildManagementStandardNameMap,
  resolveManagementStandardLabel,
} from "@/lib/management-standard-label";

type EvidenceRow = {
  id?: string;
  template_record_id?: string;
  template_preview_ref?: string;
  workflow_status?: string;
  capture_data?: Record<string, unknown>;
  verify_archive_data?: Record<string, unknown>;
  designated_verifier_user_id?: string;
  designated_verifier_name?: string;
  support_user_id?: string;
  support_user_name?: string;
  created_at?: string;
};

function parseJsonish<T extends Record<string, unknown>>(v: unknown): T {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as T;
  if (typeof v === "string" && v.trim()) {
    try {
      const p = JSON.parse(v) as unknown;
      if (p && typeof p === "object" && !Array.isArray(p)) return p as T;
    } catch {
      /* ignore */
    }
  }
  return {} as T;
}

export default function DocumentaryEvidenceVerifyContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = (params?.orgId as string) || "";
  const documentsHref = orgId ? getDashboardPath(orgId, "documents") : "/";
  const recordsHref = orgId ? getDashboardPath(orgId, "documents/documentary-evidence") : "/";

  const evidenceRecordId = searchParams.get("evidenceRecordId")?.trim() ?? "";
  const templateRecordIdFromUrl = searchParams.get("recordId")?.trim() ?? "";
  const templateRefFromUrl = searchParams.get("template")?.trim() ?? "";

  const [meReady, setMeReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [leadershipTier, setLeadershipTier] = useState<string | undefined>(undefined);

  const [evidence, setEvidence] = useState<EvidenceRow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfTemplateMeta, setPdfTemplateMeta] = useState<Partial<EvidencePdfData>>({});

  const templateRecordId =
    templateRecordIdFromUrl || String(evidence?.template_record_id ?? "").trim();
  const templateRef =
    templateRefFromUrl || String(evidence?.template_preview_ref ?? "").trim();

  useEffect(() => {
    let ignore = false;
    async function loadMe() {
      if (!orgId) {
        if (!ignore) setMeReady(true);
        return;
      }
      try {
        const [meRes, profileRes] = await Promise.all([
          fetch(`/api/organization/${orgId}/me`, { credentials: "include" }),
          fetch("/api/user/profile", { credentials: "include" }),
        ]);
        const j = meRes.ok ? await meRes.json() : {};
        const profile = profileRes.ok ? await profileRes.json() : {};
        if (!ignore) {
          setUserId(typeof j.userId === "string" ? j.userId : null);
          setLeadershipTier(typeof j.leadershipTier === "string" ? j.leadershipTier : undefined);
          setUserName(String(profile.name ?? profile.email ?? "").trim());
          setJobTitle(String(profile.jobTitle ?? j.jobTitle ?? "").trim());
          setEmployeeId(String(profile.employeeId ?? "").trim());
        }
      } catch {
        if (!ignore) {
          setUserId(null);
          setLeadershipTier(undefined);
        }
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
      if (!orgId || !evidenceRecordId) {
        if (!ignore) {
          setLoading(false);
          setEvidence(null);
          setLoadError(!evidenceRecordId ? "Missing evidence record." : null);
        }
        return;
      }
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(
          `/api/organization/${orgId}/documentary-evidence-records?id=${encodeURIComponent(evidenceRecordId)}`,
          { credentials: "include" }
        );
        const j = (await res.json().catch(() => ({}))) as { records?: EvidenceRow[]; error?: string };
        if (!res.ok) {
          if (!ignore) setLoadError(typeof j.error === "string" ? j.error : "Could not load record.");
          return;
        }
        const row = Array.isArray(j.records) && j.records[0] ? j.records[0] : null;
        if (!ignore) setEvidence(row);
      } catch {
        if (!ignore) setLoadError("Network error.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void loadEv();
    return () => {
      ignore = true;
    };
  }, [orgId, evidenceRecordId]);

  useEffect(() => {
    if (!orgId || !templateRecordId) {
      setPdfTemplateMeta({});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [docRes, orgRes, checklistsRes] = await Promise.all([
          fetch(`/api/organization/${orgId}/documents?id=${encodeURIComponent(templateRecordId)}`, {
            credentials: "include",
          }),
          fetch(`/api/organization/${orgId}/organization-info`, { credentials: "include" }),
          fetch(`/api/organization/${orgId}/audit-checklists`, { credentials: "include" }),
        ]);
        const docJ = docRes.ok ? await docRes.json() : {};
        const orgJ = orgRes.ok ? await orgRes.json() : {};
        const checklistsJ = checklistsRes.ok ? await checklistsRes.json() : {};
        if (cancelled) return;
        const row = Array.isArray(docJ?.records) ? docJ.records[0] : null;
        const fd =
          row?.form_data && typeof row.form_data === "object" && !Array.isArray(row.form_data)
            ? (row.form_data as Record<string, unknown>)
            : {};
        const oi =
          orgJ?.organizationInfo && typeof orgJ.organizationInfo === "object"
            ? (orgJ.organizationInfo as Record<string, unknown>)
            : {};
        const orgName = String(oi.organizationName ?? oi.companyName ?? oi.name ?? "").trim();
        const standardNameById = buildManagementStandardNameMap(
          Array.isArray(checklistsJ?.checklists) ? checklistsJ.checklists : []
        );
        const previewRef = compactSiteCodeInDocumentRef(
          String(row?.preview_doc_ref ?? templateRef ?? "").trim()
        );
        const refParts = previewRef.split("/").filter(Boolean);
        const siteFromRef = compactSiteCode(refParts[2] ?? "");
        const processFromRef = String(refParts[3] ?? "").trim();
        const siteFromForm = compactSiteCode(String(fd.siteId ?? fd.site ?? "").trim());
        const processFromForm = String(fd.processName ?? fd.processId ?? "").trim();
        setPdfTemplateMeta({
          companyName: orgName || undefined,
          formTitle: String(fd.title ?? "").trim() || undefined,
          siteLabel: siteFromRef || siteFromForm || undefined,
          processLabel: processFromRef || processFromForm || undefined,
          standardLabel:
            resolveManagementStandardLabel(String(fd.managementStandard ?? ""), standardNameById) ||
            undefined,
          clauseLabel: String(fd.clause ?? "").trim() || undefined,
          subClauseLabel: String(fd.subClause ?? "").trim() || undefined,
        });
      } catch {
        if (!cancelled) setPdfTemplateMeta({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId, templateRecordId]);

  const captureData = useMemo(() => parseJsonish<Record<string, unknown>>(evidence?.capture_data), [evidence]);
  const verifyData = useMemo(() => parseJsonish<Record<string, unknown>>(evidence?.verify_archive_data), [evidence]);

  const initialCapturedText = String(captureData.capturedData ?? "").trim();

  const pdfContext = useMemo((): Partial<EvidencePdfData> => {
    const savedAt = String(captureData.savedAt ?? "").trim();
    const created = String(evidence?.created_at ?? "").trim();
    const iso = savedAt || created;
    let captureDateLabel: string | undefined;
    let captureTimeLabel: string | undefined;
    if (iso) {
      const d = new Date(iso);
      if (!Number.isNaN(d.getTime())) {
        const p = (n: number) => String(n).padStart(2, "0");
        captureDateLabel = `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
        captureTimeLabel = `${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
      }
    }
    const arch = new Date();
    const recordsArchiveYm = `${arch.getFullYear()} / ${String(arch.getMonth() + 1).padStart(2, "0")}`;
    const ref = compactSiteCodeInDocumentRef(
      templateRef || String(evidence?.template_preview_ref ?? "").trim()
    );
    const refParts = ref.split("/").filter(Boolean);
    return {
      ...pdfTemplateMeta,
      siteLabel: pdfTemplateMeta.siteLabel || compactSiteCode(refParts[2] ?? "") || undefined,
      processLabel: pdfTemplateMeta.processLabel || String(refParts[3] ?? "").trim() || undefined,
      lotBatchSerial: String(captureData.lotBatchSerial ?? "").trim() || undefined,
      shiftLabel: String(captureData.shift ?? "").trim() || undefined,
      captureByName: String(evidence?.support_user_name ?? "").trim() || undefined,
      captureByUserId: String(evidence?.support_user_id ?? "").trim() || undefined,
      captureDateLabel,
      captureTimeLabel,
      recordsArchiveYm,
    };
  }, [pdfTemplateMeta, captureData, evidence, templateRef]);

  const designatedVerifier: DesignatedVerifier = useMemo(() => {
    const storedUid = String(evidence?.designated_verifier_user_id ?? "").trim();
    const storedName = String(evidence?.designated_verifier_name ?? "").trim();
    if (storedUid) {
      return { userId: storedUid, name: storedName || storedUid };
    }
    if (!isTopOrOperationalLeadershipTier(leadershipTier)) {
      return { userId: "", name: "" };
    }
    const displayName = jobTitle && userName ? `${userName} (${jobTitle})` : userName || userId || "";
    const displayId = employeeId || userId || "";
    return { userId: displayId, name: displayName };
  }, [evidence, userId, userName, jobTitle, employeeId, leadershipTier]);

  const workflowStatus = String(evidence?.workflow_status ?? "").trim();

  const canAccessRoute = canViewDocumentaryEvidenceWorkflow(leadershipTier);
  const isVerifierTier = isTopOrOperationalLeadershipTier(leadershipTier);
  const storedDesignatedId = String(evidence?.designated_verifier_user_id ?? "").trim();
  const isDesignatedVerifier = Boolean(userId && storedDesignatedId && storedDesignatedId === userId);
  const canCompleteVerification = isVerifierTier && (!storedDesignatedId || isDesignatedVerifier);

  const captureViewHref = useMemo(() => {
    const ref = templateRef || String(evidence?.template_preview_ref ?? "").trim();
    const rid = templateRecordId || String(evidence?.template_record_id ?? "").trim();
    if (!orgId || !rid || !evidenceRecordId) return recordsHref;
    const u = new URLSearchParams();
    u.set("template", ref);
    u.set("recordId", rid);
    u.set("evidenceRecordId", evidenceRecordId);
    u.set("mode", "view");
    return `${getDashboardPath(orgId, "documents/documentary-evidence/capture")}?${u.toString()}`;
  }, [orgId, templateRef, templateRecordId, evidence, evidenceRecordId, recordsHref]);

  if (!meReady || loading) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-xl border border-border bg-muted/30 px-6 py-16">
        <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
        <p className="text-sm font-medium text-foreground">Loading…</p>
      </div>
    );
  }

  if (!canAccessRoute) {
    return (
      <Card className="border-amber-200 bg-amber-50/90">
        <CardContent className="py-10 text-center space-y-3">
          <h2 className="text-lg font-semibold text-amber-950">Access restricted</h2>
          <p className="text-sm text-amber-900/90 max-w-md mx-auto">
            Documentary evidence verification is available to Support Leadership and Top/Operational leadership only.
          </p>
          <Button asChild variant="outline">
            <Link href={recordsHref}>Back to templates</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loadError || !evidence) {
    return (
      <Card className="border-red-200 bg-red-50/80">
        <CardContent className="py-10 text-center space-y-3">
          <h2 className="text-lg font-semibold text-red-950">Record not available</h2>
          <p className="text-sm text-red-900/90">{loadError ?? "Evidence record could not be loaded."}</p>
          <Button asChild variant="outline">
            <Link href={recordsHref}>Back to templates</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (workflowStatus === "draft") {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-3">
          <p className="text-sm text-muted-foreground">This evidence is still in draft capture. Complete capture first.</p>
          <Button asChild variant="outline">
            <Link href={recordsHref}>Back to templates</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (workflowStatus === "capture_submitted" || workflowStatus === "completed") {
    if (!evidenceRecordId) return null;
    const ref = compactSiteCodeInDocumentRef(
      templateRef || String(evidence.template_preview_ref ?? "").trim()
    );
    const isCompleted = workflowStatus === "completed";
    const canEdit = !isCompleted && canCompleteVerification;
    return (
      <div className="space-y-6">
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
            <li>
              <Link href={captureViewHref} className="text-muted-foreground hover:text-foreground">
                Capture
              </Link>
            </li>
            <li className="text-muted-foreground/70">›</li>
            <li className="font-semibold text-primary">Verify</li>
          </ol>
        </nav>
        <VerifyArchiveEvidenceStep
          orgId={orgId}
          evidenceRecordId={evidenceRecordId}
          templateRef={ref}
          initialCapturedData={initialCapturedText}
          designatedVerifier={designatedVerifier}
          stepMode={canEdit ? "edit" : "readonly-completed"}
          initialVerificationComments={String(verifyData.verificationComments ?? "").trim()}
          initialArchiveLocation={String(verifyData.archiveLocation ?? "").trim()}
          initialRetentionPeriod={String(verifyData.retentionPeriod ?? "").trim()}
          pdfContext={pdfContext}
          onBack={() => router.push(captureViewHref)}
          onConfirmComplete={() =>
            router.push(orgId ? `${getDashboardPath(orgId, "documents")}?table=records` : "/")
          }
        />
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="py-10 text-center text-sm text-muted-foreground">
        Unknown workflow state.
        <div className="mt-4">
          <Button asChild variant="outline">
            <Link href={recordsHref}>Back to templates</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

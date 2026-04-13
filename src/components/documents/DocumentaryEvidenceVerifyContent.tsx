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
  isSupportLeadershipTier,
  isTopOrOperationalLeadershipTier,
} from "@/lib/documentaryEvidenceAccess";
import VerifyArchiveEvidenceStep, {
  type DesignatedVerifier,
} from "@/components/documents/steps/VerifyArchiveEvidenceStep";

type EvidenceRow = {
  id?: string;
  template_record_id?: string;
  template_preview_ref?: string;
  workflow_status?: string;
  capture_data?: Record<string, unknown>;
  verify_archive_data?: Record<string, unknown>;
  designated_verifier_user_id?: string;
  designated_verifier_name?: string;
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
  const templateRecordId = searchParams.get("recordId")?.trim() ?? "";
  const templateRef = searchParams.get("template")?.trim() ?? "";

  const [meReady, setMeReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [leadershipTier, setLeadershipTier] = useState<string | undefined>(undefined);

  const [evidence, setEvidence] = useState<EvidenceRow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function loadMe() {
      if (!orgId) {
        if (!ignore) setMeReady(true);
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

  const captureData = useMemo(() => parseJsonish<Record<string, unknown>>(evidence?.capture_data), [evidence]);
  const verifyData = useMemo(() => parseJsonish<Record<string, unknown>>(evidence?.verify_archive_data), [evidence]);

  const initialCapturedText = String(captureData.capturedData ?? "").trim();

  const designatedVerifier: DesignatedVerifier | null = useMemo(() => {
    const uid = String(evidence?.designated_verifier_user_id ?? "").trim();
    const name = String(evidence?.designated_verifier_name ?? "").trim();
    if (!uid) return null;
    return { userId: uid, name: name || uid };
  }, [evidence]);

  const workflowStatus = String(evidence?.workflow_status ?? "").trim();

  const canAccessRoute = canViewDocumentaryEvidenceWorkflow(leadershipTier);
  const isSupport = isSupportLeadershipTier(leadershipTier);
  const isVerifierTier = isTopOrOperationalLeadershipTier(leadershipTier);
  const isDesignatedVerifier =
    Boolean(userId && designatedVerifier && designatedVerifier.userId === userId);

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
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-6 py-16">
        <Loader2 className="h-10 w-10 animate-spin text-[#22B323]" aria-hidden />
        <p className="text-sm font-medium text-[#374151]">Loading…</p>
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

  if (workflowStatus === "capture_submitted") {
    if (isSupport) {
      return (
        <div className="space-y-4">
          <Card className="border border-[#BFDBFE] bg-[#EFF6FF]">
            <CardContent className="py-6 space-y-3">
              <h2 className="text-lg font-semibold text-[#1E3A8A]">Awaiting designated verifier</h2>
              <p className="text-sm text-[#1E40AF] leading-relaxed">
                Capture has been submitted. The designated verifier must complete verification and archive. You can
                review captured data in read-only mode.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button asChild variant="outline" className="bg-white">
                  <Link href={captureViewHref}>View capture</Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href={recordsHref}>Back to templates</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    if (!isVerifierTier || !isDesignatedVerifier) {
      return (
        <Card className="border-amber-200 bg-amber-50/90">
          <CardContent className="py-10 text-center space-y-3">
            <h2 className="text-lg font-semibold text-amber-950">Not your verification task</h2>
            <p className="text-sm text-amber-900/90 max-w-md mx-auto">
              Only the designated Top/Operational verifier selected during capture can complete this step.
            </p>
            <Button asChild variant="outline">
              <Link href={recordsHref}>Back to templates</Link>
            </Button>
          </CardContent>
        </Card>
      );
    }
    if (!designatedVerifier || !evidenceRecordId) {
      return null;
    }
    const ref = templateRef || String(evidence.template_preview_ref ?? "").trim();
    return (
      <div className="space-y-6">
        <nav className="text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href={documentsHref} className="hover:underline">
                Documents
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link href={recordsHref} className="hover:underline">
                Documentary Evidence Records
              </Link>
            </li>
            <li>/</li>
            <li className="font-medium text-foreground">Verify &amp; Archive</li>
          </ol>
        </nav>
        <VerifyArchiveEvidenceStep
          orgId={orgId}
          evidenceRecordId={evidenceRecordId}
          templateRef={ref}
          initialCapturedData={initialCapturedText}
          designatedVerifier={designatedVerifier}
          stepMode="edit"
          onBack={() => router.push(recordsHref)}
          onConfirmComplete={() => router.push(recordsHref)}
        />
      </div>
    );
  }

  if (workflowStatus === "completed") {
    if (!designatedVerifier || !evidenceRecordId) return null;
    const ref = templateRef || String(evidence.template_preview_ref ?? "").trim();
    return (
      <div className="space-y-6">
        <nav className="text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href={documentsHref} className="hover:underline">
                Documents
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link href={recordsHref} className="hover:underline">
                Documentary Evidence Records
              </Link>
            </li>
            <li>/</li>
            <li className="font-medium text-foreground">Record (Active)</li>
          </ol>
        </nav>
        <VerifyArchiveEvidenceStep
          orgId={orgId}
          evidenceRecordId={evidenceRecordId}
          templateRef={ref}
          initialCapturedData={initialCapturedText}
          designatedVerifier={designatedVerifier}
          stepMode="readonly-completed"
          initialVerificationComments={String(verifyData.verificationComments ?? "").trim()}
          initialArchiveLocation={String(verifyData.archiveLocation ?? "").trim()}
          initialRetentionPeriod={String(verifyData.retentionPeriod ?? "").trim()}
          onBack={() => router.push(recordsHref)}
          onConfirmComplete={() => router.push(recordsHref)}
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

"use client";

import { useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getDashboardPath } from "@/lib/subdomain";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, FileText, ClipboardList, AlertCircle, CheckCircle, FileCheck, RotateCcw, FileStack } from "lucide-react";
import { useTranslate } from "@/components/providers/translation-provider";

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-2">{children}</CardContent>
    </Card>
  );
}

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex flex-wrap gap-x-2">
      <span className="font-medium text-muted-foreground min-w-[140px]">{label}:</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

export default function AuditDetailHistoryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { t } = useTranslate();
  const orgId = params?.orgId as string;
  const auditPlanId = searchParams.get("auditPlanId") ?? "";
  const step4Labels = useMemo(
    () => [
      t("Step 4 – S2"),
      t("Step 4 – S3"),
      t("Step 4 – S6"),
      t("Step 4 – S7"),
      t("Step 4 – 4.1"),
      t("Step 4 – 4.2"),
      t("Step 4 – 4.3"),
      t("Step 4 – 4.5"),
      t("Step 4 – 4.6"),
    ],
    [t]
  );

  const { data: planRes, isLoading: planLoading, error: planError } = useQuery({
    queryKey: ["auditPlan", orgId, auditPlanId],
    queryFn: () => apiClient.getAuditPlan(orgId, auditPlanId),
    enabled: !!orgId && !!auditPlanId,
  });

  const plan = (planRes as { plan?: any })?.plan;

  const { data: membersRes } = useQuery({
    queryKey: ["orgMembers", orgId],
    queryFn: () => apiClient.getMembers(orgId),
    enabled: !!orgId && !!plan,
  });
  const teamMembers = (membersRes as { teamMembers?: Array<{ id: string; name?: string; email?: string }> })?.teamMembers ?? [];
  const auditeeName = plan
    ? (teamMembers.find((m) => m.id === plan.auditeeUserId)?.name || teamMembers.find((m) => m.id === plan.auditeeUserId)?.email || plan.auditeeUserId || "—")
    : "—";
  const assignedAuditorId = plan?.assignedAuditorIds?.[0];
  const auditorName = plan && assignedAuditorId
    ? (teamMembers.find((m) => m.id === assignedAuditorId)?.name || teamMembers.find((m) => m.id === assignedAuditorId)?.email || assignedAuditorId)
    : "—";
  const leadAuditorName = plan
    ? (teamMembers.find((m) => m.id === plan.leadAuditorUserId)?.name || teamMembers.find((m) => m.id === plan.leadAuditorUserId)?.email || plan.leadAuditorUserId || "—")
    : "—";

  const { data: findingsRes } = useQuery({
    queryKey: ["auditPlanFindings", orgId, auditPlanId],
    queryFn: () => apiClient.getAuditPlanFindings(orgId, auditPlanId),
    enabled: !!orgId && !!auditPlanId && !!plan,
  });

  const findings = (findingsRes as { findings?: any[] })?.findings ?? [];

  if (!orgId || !auditPlanId) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <p className="text-muted-foreground">{t("Missing audit plan. Go back to the audit list and open Detail History for an audit.")}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href={getDashboardPath(orgId, "audit")}>{t("Back to Audits")}</Link>
        </Button>
      </div>
    );
  }

  if (planLoading || planError) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <p className="text-muted-foreground">{planLoading ? t("Loading…") : t("Failed to load audit.")}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href={getDashboardPath(orgId, "audit")}>{t("Back to Audits")}</Link>
        </Button>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <p className="text-muted-foreground">{t("Audit plan not found.")}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href={getDashboardPath(orgId, "audit")}>{t("Back to Audits")}</Link>
        </Button>
      </div>
    );
  }

  const step2 = plan.step2Data && typeof plan.step2Data === "object" ? plan.step2Data : {};
  const step4 = plan.step4Data && typeof plan.step4Data === "object" ? plan.step4Data : {};
  const step5 = plan.step5Data && typeof plan.step5Data === "object" ? plan.step5Data : {};
  const step6 = plan.step6Data && typeof plan.step6Data === "object" ? plan.step6Data : {};
  const amrcRows = Array.isArray(step2.amrcRows) ? step2.amrcRows : [];

  const returnedFromStep5 =
    (step5 as any).verificationOutcome === "ineffective" &&
    ((step5 as any).auditorComments != null && String((step5 as any).auditorComments).trim() !== "");
  const returnedFromStep6 =
    (step6 as any).finalDecision === "ineffective" &&
    ((step6 as any).managementComments != null && String((step6 as any).managementComments).trim() !== "");
  const hasReturnToAuditee = returnedFromStep5 || returnedFromStep6;

  const fileEntry = (item: unknown): { name: string; key: string } | null => {
    if (item && typeof item === "object" && "key" in item && typeof (item as any).key === "string") {
      return { name: String((item as any).name ?? (item as any).fileName ?? "Document"), key: (item as any).key };
    }
    return null;
  };
  const step4FileKeys = [
    (step4 as any).filesS2,
    (step4 as any).filesS3,
    (step4 as any).filesS6,
    (step4 as any).filesS7,
    (step4 as any).files41,
    (step4 as any).files42,
    (step4 as any).files43,
    (step4 as any).files45,
    (step4 as any).files46,
  ];
  const step4Files: { name: string; key: string; source: string }[] = [];
  step4FileKeys.forEach((arr, i) => {
    if (Array.isArray(arr)) {
      arr.forEach((item) => {
        const e = fileEntry(item);
        if (e) step4Files.push({ ...e, source: step4Labels[i] });
      });
    }
  });
  const step5Evidence = Array.isArray((step5 as any).evidenceFiles)
    ? ((step5 as any).evidenceFiles as unknown[]).map((item) => fileEntry(item)).filter((e): e is { name: string; key: string } => e != null)
    : [];
  const allDocuments = [...step4Files, ...step5Evidence.map((e) => ({ ...e, source: t("Step 5 – Evidence") }))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={getDashboardPath(orgId, "audit")}>
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("Audit Detail History")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("Audit")} #{plan.auditNumber ?? plan.id} • {plan.title || t("Untitled")} • {t("Status:")} {plan.status ?? "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Step 1 – Audit Program */}
      <Section title={t("Step 1: Audit Program")} icon={FileText}>
        <DataRow label={t("Program")} value={plan.programName} />
        <DataRow label={t("Audit type")} value={plan.auditType} />
        <DataRow label={t("Criteria")} value={plan.programCriteria ?? plan.criteria} />
        <DataRow label={t("Created")} value={formatDate(plan.createdAt)} />
      </Section>

      {/* Step 2 – Audit Plan */}
      <Section title={t("Step 2: Audit Plan")} icon={FileText}>
        <DataRow label={t("Title")} value={plan.title} />
        <DataRow label={t("Audit #")} value={plan.auditNumber} />
        <DataRow label={t("Criteria")} value={plan.criteria} />
        <DataRow label={t("Planned date")} value={formatDate(plan.plannedDate)} />
        <DataRow label={t("Date prepared")} value={formatDate(plan.datePrepared)} />
        <DataRow label={t("Plan submitted")} value={formatDate(plan.planSubmittedAt)} />
        {(step2.tpccRegisteredProcess || step2.tpccAuditReference) && (
          <>
            <DataRow label={t("TPCC registered process")} value={(step2 as any).tpccRegisteredProcess} />
            <DataRow label={t("TPCC audit reference")} value={(step2 as any).tpccAuditReference} />
          </>
        )}
        {(step2 as any).leadAuditorComments && (
          <DataRow label={t("Lead auditor comments")} value={(step2 as any).leadAuditorComments} />
        )}
        {(step2 as any).rescheduleAuditPlan && (
          <DataRow label={t("Reschedule audit plan")} value={(step2 as any).rescheduleAuditPlan} />
        )}
        {amrcRows.length > 0 && (
          <div className="mt-3">
            <p className="font-medium text-foreground mb-2">{t("Audit Methods & Risk Considerations")}</p>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">{t("Review category")}</th>
                    <th className="text-left p-2">{t("Comments")}</th>
                    <th className="text-left p-2">{t("Priority")}</th>
                    <th className="text-left p-2">{t("Action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {amrcRows.map((r: any, i: number) => (
                    <tr key={r.id || i} className="border-t">
                      <td className="p-2">{i + 1}</td>
                      <td className="p-2">{r.reviewCategory ?? r.review_category ?? "—"}</td>
                      <td className="p-2">{r.comments ?? "—"}</td>
                      <td className="p-2">{r.priority ?? "—"}</td>
                      <td className="p-2">{r.action ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Section>

      {/* Step 3 – Findings */}
      <Section title={t("Step 3: Audit Findings")} icon={ClipboardList}>
        <DataRow label={t("Findings submitted")} value={formatDate(plan.findingsSubmittedAt)} />
        {findings.length === 0 ? (
          <p className="text-muted-foreground">{t("No findings recorded.")}</p>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden mt-2">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="text-left p-2">{t("Clause")}</th>
                  <th className="text-left p-2">{t("Requirement")}</th>
                  <th className="text-left p-2">{t("Question")}</th>
                  <th className="text-left p-2">{t("Evidence")}</th>
                  <th className="text-left p-2">{t("Status")}</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((f: any, i: number) => (
                  <tr key={f.id || i} className="border-t">
                    <td className="p-2">{f.clause ?? "—"}</td>
                    <td className="p-2 max-w-[200px] truncate" title={f.requirement}>{f.requirement ?? "—"}</td>
                    <td className="p-2 max-w-[200px] truncate" title={f.question}>{f.question ?? "—"}</td>
                    <td className="p-2 max-w-[180px] truncate" title={typeof f.evidenceSeen === "string" ? f.evidenceSeen : (f.evidenceSeen ? JSON.stringify(f.evidenceSeen) : "")}>
                      {typeof f.evidenceSeen === "string" ? f.evidenceSeen : (f.evidenceSeen ? t("See details") : "—")}
                    </td>
                    <td className="p-2">{f.status ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Return(s) to auditee */}
      {hasReturnToAuditee && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-800">
              <RotateCcw className="h-5 w-5" />
              {t("Return(s) to auditee")}
            </CardTitle>
            <p className="text-sm font-normal text-amber-700">
              {t("The audit was returned to the auditee for revision. Comments from auditor or management are below. The Step 4 data shown after this is the latest revision submitted by the auditee.")}
            </p>
          </CardHeader>
          <CardContent className="text-sm space-y-4">
            {returnedFromStep5 && (
              <div className="rounded-lg border border-amber-200 bg-card p-3">
                <p className="font-semibold text-foreground mb-1">{t("Returned from Step 5 (Assigned Auditor)")}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-2">
                  <span><strong>{t("Auditee:")}</strong> {auditeeName}</span>
                  <span><strong>{t("Auditor:")}</strong> {auditorName}</span>
                </div>
                {(step5 as any).verificationStartedAt && (
                  <p className="text-xs text-muted-foreground mb-2">{formatDate((step5 as any).verificationStartedAt)}</p>
                )}
                <p className="text-muted-foreground whitespace-pre-wrap">{(step5 as any).auditorComments}</p>
              </div>
            )}
            {returnedFromStep6 && (
              <div className="rounded-lg border border-amber-200 bg-card p-3">
                <p className="font-semibold text-foreground mb-1">{t("Returned from Step 6 (Lead Auditor / Management)")}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-2">
                  <span><strong>{t("Auditee:")}</strong> {auditeeName}</span>
                  <span><strong>{t("Lead Auditor:")}</strong> {leadAuditorName}</span>
                </div>
                {((step6 as any).dateApproved || (step6 as any).timeApproved) && (
                  <p className="text-xs text-muted-foreground mb-2">
                    {(step6 as any).dateApproved ? formatDate((step6 as any).dateApproved) : ""}
                    {(step6 as any).dateApproved && (step6 as any).timeApproved ? " " : ""}
                    {(step6 as any).timeApproved ?? ""}
                  </p>
                )}
                <p className="text-muted-foreground whitespace-pre-wrap">{(step6 as any).managementComments}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4 – Corrective Action (revision after return) */}
      <Section title={t("Step 4: Corrective Action (Auditee)")} icon={AlertCircle}>
        {hasReturnToAuditee && (
          <p className="text-amber-700 text-sm font-medium mb-2 rounded-md bg-amber-50 border border-amber-200 px-2 py-1.5">
            {t("Latest revision (data submitted by auditee after return to auditee).")}
          </p>
        )}
        <DataRow label={t("Containment description")} value={(step4 as any).containmentDescription} />
        <DataRow label={t("Responsible person")} value={(step4 as any).responsiblePerson} />
        <DataRow label={t("Target completion date")} value={(step4 as any).targetCompletionDate} />
        <DataRow label={t("Root cause narrative")} value={(step4 as any).rootCauseNarrative} />
        <DataRow label={t("Similar processes impacted")} value={(step4 as any).similarProcessesImpacted} />
        <DataRow label={t("Similar processes list")} value={(step4 as any).similarProcessesList} />
        <DataRow label={t("Root cause result")} value={(step4 as any).rootCauseResult} />
        <DataRow label={t("Root cause analysis")} value={(step4 as any).rootCauseAnalysis} />
        <DataRow label={t("Systemic corrective action")} value={(step4 as any).systemicCorrectiveAction} />
        <DataRow label={t("Corrective action plan")} value={(step4 as any).correctiveActionPlan} />
        <DataRow label={t("Implementation (Y/N)")} value={(step4 as any).implementationYesNo} />
        <DataRow label={t("Implementation details")} value={(step4 as any).implementationDetails} />
        <DataRow label={t("Auditee name")} value={(step4 as any).auditeeName} />
        <DataRow label={t("Auditee position")} value={(step4 as any).auditeePosition} />
        <DataRow label={t("Date of review")} value={(step4 as any).dateOfReview ? formatDate((step4 as any).dateOfReview) : undefined} />
        <DataRow label={t("Risk rating post action")} value={(step4 as any).riskRatingPostAction} />
        <DataRow label={t("Risk justification post")} value={(step4 as any).riskJustificationPost} />
        <DataRow label={t("Auditee comments")} value={(step4 as any).auditeeComments} />
      </Section>

      {/* Step 5 – Verification */}
      <Section title={t("Step 5: Effectiveness Verification")} icon={CheckCircle}>
        <DataRow label={t("Outcome")} value={(step5 as any).verificationOutcome} />
        <DataRow label={t("Verification started")} value={(step5 as any).verificationStartedAt} />
        <DataRow label={t("Auditor comments")} value={(step5 as any).auditorComments} />
        {Array.isArray((step5 as any).evidenceFiles) && (step5 as any).evidenceFiles.length > 0 && (
          <div className="mt-2">
            <p className="font-medium text-gray-600">{t("Evidence files:")} {(step5 as any).evidenceFiles.length} {t("file(s)")}</p>
          </div>
        )}
      </Section>

      {/* Step 6 – Closure */}
      <Section title={t("Step 6: Final Closure")} icon={FileCheck}>
        <DataRow label={t("Final decision")} value={(step6 as any).finalDecision} />
        <DataRow label={t("Date approved")} value={(step6 as any).dateApproved} />
        <DataRow label={t("Time approved")} value={(step6 as any).timeApproved} />
        <DataRow label={t("Management comments")} value={(step6 as any).managementComments} />
      </Section>

      {/* Documents */}
      {allDocuments.length > 0 && (
        <Section title={t("Documents")} icon={FileStack}>
            <p className="text-muted-foreground mb-3">{t("Documents uploaded during this audit. Click to open or download.")}</p>
          <ul className="space-y-2">
            {allDocuments.map((doc, i) => (
              <li key={`${doc.key}-${i}`} className="flex items-center gap-2 flex-wrap">
                <a
                  href={`/api/files/download?key=${encodeURIComponent(doc.key)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium"
                >
                  {doc.name}
                </a>
                <span className="text-xs text-muted-foreground">({doc.source})</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="pt-4">
        <Button variant="outline" asChild>
          <Link href={getDashboardPath(orgId, "audit")}>{t("Back to Audits")}</Link>
        </Button>
      </div>
    </div>
  );
}

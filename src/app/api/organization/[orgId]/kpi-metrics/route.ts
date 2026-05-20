import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { getTenantClient } from "@/lib/db/tenant-pool";
import {
  buildOrgKpiMetrics,
  documentaryEvidenceCompliancePercent,
} from "@/lib/org-kpi-metrics";
import type { PoolClient } from "pg";

async function tableExists(client: PoolClient, name: string): Promise<boolean> {
  const res = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
    [name]
  );
  return res.rows.length > 0;
}

/**
 * GET /api/organization/[orgId]/kpi-metrics
 * Organization-wide KPI summary for settings and reports.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const ctx = await getRequestContext(req, orgId);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await getTenantClient(ctx.tenant.orgId);

    try {
      let avgIssueResolutionHours: number | null = null;
      let issueCompletionPercent: number | null = null;
      let auditCompletionPercent: number | null = null;
      let documentCompliancePercent: number | null = null;
      let avgIssueKpiScore: number | null = null;

      if (await tableExists(client, "issues")) {
        const hasVerifications = await tableExists(client, "issue_verifications");

        if (hasVerifications) {
          const resolutionRes = await client.query<{ avg_hours: string | null }>(
            `SELECT AVG(
              EXTRACT(EPOCH FROM (
                COALESCE(iv."closeOutDate", iv."verificationDate", i."updatedAt") - i."createdAt"
              )) / 3600
            )::text AS avg_hours
            FROM issues i
            LEFT JOIN issue_verifications iv ON iv."issueId" = i.id
            WHERE i.status = 'done' AND i."createdAt" IS NOT NULL`
          );
          const rawHours = resolutionRes.rows[0]?.avg_hours;
          if (rawHours != null) {
            const parsed = parseFloat(rawHours);
            if (!Number.isNaN(parsed)) avgIssueResolutionHours = parsed;
          }

          const kpiRes = await client.query<{ avg_score: string | null }>(
            `SELECT AVG(iv."kpiScore")::text AS avg_score
             FROM issue_verifications iv
             JOIN issues i ON i.id = iv."issueId"
             WHERE iv."kpiScore" > 0`
          );
          const rawScore = kpiRes.rows[0]?.avg_score;
          if (rawScore != null) {
            const parsed = parseFloat(rawScore);
            if (!Number.isNaN(parsed)) avgIssueKpiScore = parsed;
          }
        } else {
          const resolutionRes = await client.query<{ avg_hours: string | null }>(
            `SELECT AVG(
              EXTRACT(EPOCH FROM (i."updatedAt" - i."createdAt")) / 3600
            )::text AS avg_hours
            FROM issues i
            WHERE i.status = 'done' AND i."createdAt" IS NOT NULL AND i."updatedAt" IS NOT NULL`
          );
          const rawHours = resolutionRes.rows[0]?.avg_hours;
          if (rawHours != null) {
            const parsed = parseFloat(rawHours);
            if (!Number.isNaN(parsed)) avgIssueResolutionHours = parsed;
          }
        }

        const completionRes = await client.query<{ total: string; done: string }>(
          `SELECT
            COUNT(*)::text AS total,
            COUNT(*) FILTER (WHERE status = 'done')::text AS done
           FROM issues`
        );
        const total = parseInt(completionRes.rows[0]?.total ?? "0", 10);
        const done = parseInt(completionRes.rows[0]?.done ?? "0", 10);
        if (total > 0) {
          issueCompletionPercent = Math.round((done / total) * 100);
        }
      }

      if (await tableExists(client, "audit_plans")) {
        const auditRes = await client.query<{ total: string; closed: string }>(
          `SELECT
            COUNT(*)::text AS total,
            COUNT(*) FILTER (WHERE status = 'closed')::text AS closed
           FROM audit_plans`
        );
        const total = parseInt(auditRes.rows[0]?.total ?? "0", 10);
        const closed = parseInt(auditRes.rows[0]?.closed ?? "0", 10);
        if (total > 0) {
          auditCompletionPercent = Math.round((closed / total) * 100);
        } else {
          auditCompletionPercent = 100;
        }
      }

      if (await tableExists(client, "documentary_evidence_records")) {
        const evidenceRes = await client.query<{ created_at: Date }>(
          `SELECT created_at FROM documentary_evidence_records
           WHERE workflow_status = 'capture_submitted'`
        );
        const pct = documentaryEvidenceCompliancePercent(evidenceRes.rows);
        if (pct != null) documentCompliancePercent = pct;
      }

      if (documentCompliancePercent == null && (await tableExists(client, "document_module_records"))) {
        const docRes = await client.query<{ created_at: Date; lifecycle_status: string | null }>(
          `SELECT created_at, lifecycle_status FROM document_module_records
           WHERE COALESCE(lifecycle_status, 'active') = 'active'`
        );
        if (docRes.rows.length > 0) {
          let consistent = 0;
          for (const row of docRes.rows) {
            const days = Math.floor(
              (Date.now() - new Date(row.created_at).getTime()) / 86400000
            );
            if (days <= 30) consistent += 1;
          }
          documentCompliancePercent = Math.round((consistent / docRes.rows.length) * 100);
        }
      }

      const kpis = buildOrgKpiMetrics({
        avgIssueResolutionHours,
        issueCompletionPercent,
        auditCompletionPercent,
        documentCompliancePercent,
        avgIssueKpiScore,
      });

      return NextResponse.json({
        kpis,
        computedAt: new Date().toISOString(),
      });
    } catch (dbError: unknown) {
      const message = dbError instanceof Error ? dbError.message : "Database error";
      return NextResponse.json({ error: "Failed to fetch KPI metrics", message }, { status: 500 });
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

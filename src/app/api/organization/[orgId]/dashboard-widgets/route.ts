import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { getTenantClient } from "@/lib/db/tenant-pool";
import {
  DEFAULT_DASHBOARD_WIDGETS,
  normalizeDashboardWidgets,
  type DashboardWidgetsConfig,
} from "@/lib/dashboard-widgets";
import crypto from "crypto";
import type { PoolClient } from "pg";
import {
  ORG_CONFIG_ROLES,
  requireOrgRoles,
} from "@/lib/require-org-role";

const WIDGET_COLUMNS = [
  "tasksCompleted",
  "complianceScore",
  "workloadByUser",
  "overdueTasks",
  "issueDistribution",
  "auditTrend",
  "projectProgress",
  "documentVersion",
  "recentActivity",
] as const;

async function ensureDashboardWidgetsSchema(client: PoolClient) {
  await client.query(
    `ALTER TABLE "dashboard_widgets" ADD COLUMN IF NOT EXISTS "recentActivity" BOOLEAN NOT NULL DEFAULT true`
  );
}

function rowToWidgets(row: Record<string, unknown>): DashboardWidgetsConfig {
  const partial: Partial<DashboardWidgetsConfig> = {};
  for (const col of WIDGET_COLUMNS) {
    if (col in row) {
      partial[col] = Boolean(row[col]);
    }
  }
  return normalizeDashboardWidgets(partial);
}

/**
 * GET /api/organization/[orgId]/dashboard-widgets
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
      const tableCheck = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dashboard_widgets'`
      );
      if (tableCheck.rows.length === 0) {
        client.release();
        return NextResponse.json({
          widgets: DEFAULT_DASHBOARD_WIDGETS,
          updatedAt: null,
        });
      }

      await ensureDashboardWidgetsSchema(client);

      const result = await client.query(`SELECT * FROM dashboard_widgets ORDER BY "updatedAt" DESC LIMIT 1`);
      client.release();

      if (result.rows.length === 0) {
        return NextResponse.json({
          widgets: DEFAULT_DASHBOARD_WIDGETS,
          updatedAt: null,
        });
      }

      const row = result.rows[0];
      return NextResponse.json({
        widgets: rowToWidgets(row),
        updatedAt: row.updatedAt ?? null,
      });
    } catch (dbError: unknown) {
      client.release();
      const message = dbError instanceof Error ? dbError.message : "Database error";
      return NextResponse.json({ error: "Failed to fetch dashboard widgets", message }, { status: 500 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/organization/[orgId]/dashboard-widgets
 * Body: { widgets: Partial<DashboardWidgetsConfig> }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const ctx = await getRequestContext(req, orgId);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const denied = requireOrgRoles(
      ctx,
      ORG_CONFIG_ROLES,
      "Only owners, admins, and managers can update dashboard widgets."
    );
    if (denied) return denied;

    const body = await req.json();
    const incoming = body?.widgets as Partial<DashboardWidgetsConfig> | undefined;
    if (!incoming || typeof incoming !== "object") {
      return NextResponse.json({ error: "widgets object is required" }, { status: 400 });
    }

    const client = await getTenantClient(ctx.tenant.orgId);
    try {
      const tableCheck = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dashboard_widgets'`
      );
      if (tableCheck.rows.length === 0) {
        client.release();
        return NextResponse.json(
          { error: "Dashboard widgets not configured for this organization" },
          { status: 404 }
        );
      }

      await ensureDashboardWidgetsSchema(client);

      const existing = await client.query(`SELECT * FROM dashboard_widgets ORDER BY "updatedAt" DESC LIMIT 1`);
      const current = existing.rows.length > 0 ? rowToWidgets(existing.rows[0]) : DEFAULT_DASHBOARD_WIDGETS;
      const merged = normalizeDashboardWidgets({ ...current, ...incoming });

      if (existing.rows.length === 0) {
        const id = crypto.randomUUID();
        await client.query(
          `INSERT INTO dashboard_widgets (
            id, "tasksCompleted", "complianceScore", "workloadByUser", "overdueTasks",
            "issueDistribution", "auditTrend", "projectProgress", "documentVersion",
            "recentActivity", "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
          [
            id,
            merged.tasksCompleted,
            merged.complianceScore,
            merged.workloadByUser,
            merged.overdueTasks,
            merged.issueDistribution,
            merged.auditTrend,
            merged.projectProgress,
            merged.documentVersion,
            merged.recentActivity,
          ]
        );
      } else {
        const id = existing.rows[0].id;
        await client.query(
          `UPDATE dashboard_widgets SET
            "tasksCompleted" = $2,
            "complianceScore" = $3,
            "workloadByUser" = $4,
            "overdueTasks" = $5,
            "issueDistribution" = $6,
            "auditTrend" = $7,
            "projectProgress" = $8,
            "documentVersion" = $9,
            "recentActivity" = $10,
            "updatedAt" = NOW()
          WHERE id = $1`,
          [
            id,
            merged.tasksCompleted,
            merged.complianceScore,
            merged.workloadByUser,
            merged.overdueTasks,
            merged.issueDistribution,
            merged.auditTrend,
            merged.projectProgress,
            merged.documentVersion,
            merged.recentActivity,
          ]
        );
      }

      const saved = await client.query(`SELECT * FROM dashboard_widgets ORDER BY "updatedAt" DESC LIMIT 1`);
      client.release();

      const row = saved.rows[0];
      return NextResponse.json({
        widgets: rowToWidgets(row),
        updatedAt: row.updatedAt ?? null,
      });
    } catch (dbError: unknown) {
      client.release();
      const message = dbError instanceof Error ? dbError.message : "Database error";
      return NextResponse.json({ error: "Failed to save dashboard widgets", message }, { status: 500 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

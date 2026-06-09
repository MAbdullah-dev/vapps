import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { getTenantClient } from "@/lib/db/tenant-pool";
import { prisma } from "@/lib/prisma";
import { roleToLeadershipTier } from "@/lib/roles";
import crypto from "crypto";
import type { PoolClient } from "pg";
import {
  ensureIssueCommentsColumn,
  getIssueVerificationsJoin,
  mapIssueRowWithVerification,
} from "@/lib/tenant-issues-schema";
import { logActivity } from "@/lib/activity-logger";

const ISSUE_SCHEMA_ENSURE_TTL_MS = 10 * 60 * 1000;
const issuesSchemaEnsuredAt = new Map<string, number>();
const issuesSchemaEnsureInFlight = new Map<string, Promise<void>>();

/**
 * Tenant DBs may lag migrations; org-level issue queries expect these columns.
 * Safe to run repeatedly (IF NOT EXISTS / idempotent patterns).
 */
async function ensureIssuesColumnsForSelect(client: PoolClient) {
  await client.query(`ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "siteId" TEXT`);
  await client.query(`ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "deadline" TIMESTAMP(3)`);
  await client.query(
    `ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "issuer" TEXT, ADD COLUMN IF NOT EXISTS "verifier" TEXT`
  );
  await ensureIssueCommentsColumn(client);
}

async function ensureIssuesColumnsForSelectCached(
  client: PoolClient,
  tenantOrgId: string
) {
  const now = Date.now();
  const lastEnsuredAt = issuesSchemaEnsuredAt.get(tenantOrgId) ?? 0;

  if (now - lastEnsuredAt < ISSUE_SCHEMA_ENSURE_TTL_MS) return;

  const inflight = issuesSchemaEnsureInFlight.get(tenantOrgId);
  if (inflight) {
    await inflight;
    return;
  }

  const run = ensureIssuesColumnsForSelect(client)
    .then(() => {
      issuesSchemaEnsuredAt.set(tenantOrgId, Date.now());
    })
    .finally(() => {
      issuesSchemaEnsureInFlight.delete(tenantOrgId);
    });

  issuesSchemaEnsureInFlight.set(tenantOrgId, run);
  await run;
}

async function getAccessScope(orgId: string, userId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { ownerId: true },
  });
  const userOrg = await prisma.userOrganization.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId: orgId,
      },
    },
    select: { role: true, leadershipTier: true },
  });

  const isOwner = org?.ownerId === userId;
  const userRole = isOwner ? "owner" : userOrg?.role || "member";
  const leadershipTier = userOrg?.leadershipTier || roleToLeadershipTier(userRole);
  return {
    isOwner,
    leadershipTier,
    isSupportLeadership: leadershipTier === "Support",
  };
}

/**
 * GET /api/organization/[orgId]/issues
 * Standalone issues endpoint with optional process/site filters.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const { searchParams } = new URL(req.url);
    const processId = searchParams.get("processId");
    const siteId = searchParams.get("siteId");
    const sprintIdParam = searchParams.get("sprintId");
    const sprintId = searchParams.has("sprintId") ? sprintIdParam : undefined;

    const ctx = await getRequestContext(req, orgId);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const resolvedOrgId = ctx.tenant.orgId;
    const access = await getAccessScope(resolvedOrgId, ctx.user.id);

    const client = await getTenantClient(resolvedOrgId);
    try {
      await ensureIssuesColumnsForSelectCached(client, resolvedOrgId);

      if (!access.isOwner && processId) {
        const processAccessResult = await client.query(
          `SELECT 1 FROM process_users WHERE user_id = $1 AND process_id::text = $2`,
          [ctx.user.id, processId]
        );
        if (processAccessResult.rows.length === 0) {
          client.release();
          return NextResponse.json(
            { error: "You can only view issues for assigned processes." },
            { status: 403 }
          );
        }
      }

      const { join: verificationJoin, select: verificationSelect } =
        await getIssueVerificationsJoin(client);

      let query = `
        SELECT
          i.id,
          i.title,
          i.description,
          i.priority,
          i.status,
          i.points,
          i.assignee,
          i.issuer,
          i.verifier,
          i.tags,
          i.source,
          i."sprintId",
          i."processId",
          i."siteId",
          i."order",
          i."createdAt",
          i."updatedAt",
          i."deadline"${verificationSelect}
        FROM issues i${verificationJoin}
        WHERE 1=1
      `;
      const args: any[] = [];
      let idx = 1;

      if (processId) {
        query += ` AND i."processId" = $${idx++}`;
        args.push(processId);
      }
      if (siteId) {
        query += ` AND i."siteId" = $${idx++}`;
        args.push(siteId);
      }
      if (sprintId === null || sprintId === "null") {
        query += ` AND i.status = 'to-do' AND i."sprintId" IS NULL`;
      } else if (sprintId) {
        query += ` AND i."sprintId" = $${idx++} AND i.status != 'done'`;
        args.push(sprintId);
      }

      if (!access.isOwner) {
        query += ` AND i."processId" IN (SELECT process_id::text FROM process_users WHERE user_id = $${idx++})`;
        args.push(ctx.user.id);
      }

      query += ` ORDER BY i."order" ASC, i."createdAt" ASC`;

      let result;
      try {
        result = await client.query(query, args);
      } catch (firstErr: any) {
        // e.g. 42703 undefined_column — retry once after ensuring shape (some tenants skip migrations)
        if (firstErr?.code === "42703") {
          await ensureIssuesColumnsForSelect(client);
          issuesSchemaEnsuredAt.set(resolvedOrgId, Date.now());
          result = await client.query(query, args);
        } else {
          throw firstErr;
        }
      }

      client.release();

      const issues = result.rows.map(mapIssueRowWithVerification);
      return NextResponse.json({ issues });
    } catch (dbError: any) {
      try {
        client.release();
      } catch {
        /* already released */
      }
      return NextResponse.json(
        {
          error: "Failed to fetch issues",
          message: dbError.message,
          code: dbError.code,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organization/[orgId]/issues
 * Create issue with optional process link.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const body = await req.json();
    const {
      title,
      tag,
      source,
      description,
      priority,
      status,
      points,
      assignee,
      tags,
      sprintId,
      order,
      deadline,
      processId,
      siteId,
    } = body;

    const ctx = await getRequestContext(req, orgId);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const resolvedOrgId = ctx.tenant.orgId;
    const access = await getAccessScope(resolvedOrgId, ctx.user.id);

    if (!title?.trim()) return NextResponse.json({ error: "Issue title is required" }, { status: 400 });
    if (!tag?.trim()) return NextResponse.json({ error: "Issue tag is required" }, { status: 400 });
    if (!source?.trim()) return NextResponse.json({ error: "Issue source is required" }, { status: 400 });
    if (!assignee?.trim()) return NextResponse.json({ error: "Assignee is required" }, { status: 400 });
    if (access.isSupportLeadership) {
      return NextResponse.json(
        { error: "Support leadership cannot create issues." },
        { status: 403 }
      );
    }

    const client = await getTenantClient(resolvedOrgId);
    try {
      let resolvedProcessId: string | null = processId || null;
      let resolvedSiteId: string | null = siteId || null;

      if (resolvedProcessId) {
        const processResult = await client.query(
          `SELECT id, "siteId" FROM processes WHERE id = $1`,
          [resolvedProcessId]
        );
        if (!processResult.rows.length) {
          client.release();
          return NextResponse.json({ error: "Process not found" }, { status: 404 });
        }
        resolvedSiteId = processResult.rows[0].siteId;
      }

      if (!resolvedSiteId) {
        client.release();
        return NextResponse.json(
          { error: "Site is required when issue is not linked to a process." },
          { status: 400 }
        );
      }

      if (!access.isOwner && resolvedProcessId) {
        const processAccessResult = await client.query(
          `SELECT 1 FROM process_users WHERE user_id = $1 AND process_id::text = $2`,
          [ctx.user.id, resolvedProcessId]
        );
        if (!processAccessResult.rows.length) {
          client.release();
          return NextResponse.json(
            { error: "You can only create issues for your assigned process." },
            { status: 403 }
          );
        }
      }

      let finalSprintId: string | null = sprintId || null;
      let finalStatus: string;

      if (finalSprintId) {
        if (!resolvedProcessId) {
          client.release();
          return NextResponse.json(
            { error: "Sprint can only be used for process-linked issues." },
            { status: 400 }
          );
        }
        const sprintResult = await client.query(
          `SELECT id FROM sprints WHERE id = $1 AND "processId" = $2`,
          [finalSprintId, resolvedProcessId]
        );
        if (!sprintResult.rows.length) {
          client.release();
          return NextResponse.json(
            { error: "Sprint not found or doesn't belong to the selected process" },
            { status: 404 }
          );
        }
        finalStatus = "in-progress";
      } else {
        finalStatus = status || "to-do";
        finalSprintId = null;
      }

      const tagsArray = Array.isArray(tags) && tags.length ? tags : [tag.trim()];
      const issueId = crypto.randomUUID();
      const deadlineVal = deadline != null && deadline !== "" ? new Date(deadline).toISOString() : null;

      await client.query(
        `INSERT INTO issues (
          id, title, description, priority, status, points, assignee, tags, source,
          "sprintId", "processId", "siteId", "order", "deadline", issuer, "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14, $15, NOW(), NOW()
        )`,
        [
          issueId,
          title.trim(),
          description?.trim() || null,
          priority || "medium",
          finalStatus,
          points || 0,
          assignee || null,
          tagsArray,
          source.trim(),
          finalSprintId,
          resolvedProcessId,
          resolvedSiteId,
          order || 0,
          deadlineVal,
          ctx.user.id,
        ]
      );

      const created = await client.query(`SELECT * FROM issues WHERE id = $1`, [issueId]);
      const createdIssue = created.rows[0];
      client.release();

      if (ctx.user?.id && resolvedProcessId) {
        logActivity(resolvedOrgId, resolvedProcessId, ctx.user.id, {
          action: "issue.created",
          entityType: "issue",
          entityId: createdIssue.id,
          entityTitle: createdIssue.title,
          details: {
            priority: createdIssue.priority,
            status: createdIssue.status,
            sprintId: createdIssue.sprintId,
          },
        }).catch((err) => console.error("[Org Issue Create] Failed to log activity:", err));
      }

      return NextResponse.json(
        { message: "Issue created successfully", issue: createdIssue },
        { status: 201 }
      );
    } catch (dbError: any) {
      client.release();
      return NextResponse.json(
        { error: "Failed to create issue", message: dbError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

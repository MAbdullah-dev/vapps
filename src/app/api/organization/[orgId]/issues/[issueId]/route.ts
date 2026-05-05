import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { getTenantClient } from "@/lib/db/tenant-pool";

/**
 * GET /api/organization/[orgId]/issues/[issueId]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; issueId: string }> }
) {
  try {
    const { orgId, issueId } = await params;
    const ctx = await getRequestContext(req, orgId);
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await getTenantClient(ctx.tenant.orgId);
    try {
      const result = await client.query(`SELECT * FROM issues WHERE id = $1`, [issueId]);
      client.release();
      if (!result.rows.length) {
        return NextResponse.json({ error: "Issue not found" }, { status: 404 });
      }
      return NextResponse.json({ issue: result.rows[0] });
    } catch (error: any) {
      client.release();
      return NextResponse.json(
        { error: "Failed to fetch issue", message: error.message },
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
 * PUT /api/organization/[orgId]/issues/[issueId]
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; issueId: string }> }
) {
  try {
    const { orgId, issueId } = await params;
    const ctx = await getRequestContext(req, orgId);
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();

    const client = await getTenantClient(ctx.tenant.orgId);
    try {
      const existing = await client.query(`SELECT id, assignee FROM issues WHERE id = $1`, [issueId]);
      if (!existing.rows.length) {
        client.release();
        return NextResponse.json({ error: "Issue not found" }, { status: 404 });
      }
      if (existing.rows[0].assignee !== ctx.user.id) {
        client.release();
        return NextResponse.json(
          { error: "Only the assignee of this issue can edit it." },
          { status: 403 }
        );
      }

      let resolvedProcessId: string | null | undefined = body.processId;
      let resolvedSiteId: string | null | undefined = body.siteId;

      if (resolvedProcessId !== undefined && resolvedProcessId !== null && resolvedProcessId !== "") {
        const processRes = await client.query(
          `SELECT id, "siteId" FROM processes WHERE id = $1`,
          [resolvedProcessId]
        );
        if (!processRes.rows.length) {
          client.release();
          return NextResponse.json({ error: "Process not found" }, { status: 404 });
        }
        resolvedSiteId = processRes.rows[0].siteId;
      }

      const updates: string[] = [];
      const values: any[] = [];
      let idx = 1;
      const add = (field: string, value: any) => {
        updates.push(`${field} = $${idx++}`);
        values.push(value);
      };

      if (body.title !== undefined) add(`title`, body.title?.trim());
      if (body.description !== undefined) add(`description`, body.description?.trim() || null);
      if (body.priority !== undefined) add(`priority`, body.priority);
      if (body.status !== undefined) add(`status`, body.status);
      if (body.points !== undefined) add(`points`, body.points);
      if (body.assignee !== undefined) add(`assignee`, body.assignee || null);
      if (body.tags !== undefined) add(`tags`, body.tags || []);
      if (body.sprintId !== undefined) add(`"sprintId"`, body.sprintId || null);
      if (body.order !== undefined) add(`"order"`, body.order);
      if (body.deadline !== undefined) {
        add(`"deadline"`, body.deadline === null || body.deadline === "" ? null : new Date(body.deadline).toISOString());
      }
      if (resolvedProcessId !== undefined) {
        add(`"processId"`, resolvedProcessId || null);
      }
      if (resolvedSiteId !== undefined) {
        add(`"siteId"`, resolvedSiteId || null);
      }

      if (!updates.length) {
        client.release();
        return NextResponse.json({ error: "No fields to update" }, { status: 400 });
      }
      updates.push(`"updatedAt" = NOW()`);
      values.push(issueId);

      await client.query(
        `UPDATE issues SET ${updates.join(", ")} WHERE id = $${idx}`,
        values
      );
      const updated = await client.query(`SELECT * FROM issues WHERE id = $1`, [issueId]);
      client.release();
      return NextResponse.json({ message: "Issue updated successfully", issue: updated.rows[0] });
    } catch (error: any) {
      client.release();
      return NextResponse.json(
        { error: "Failed to update issue", message: error.message },
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
 * DELETE /api/organization/[orgId]/issues/[issueId]
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; issueId: string }> }
) {
  try {
    const { orgId, issueId } = await params;
    const ctx = await getRequestContext(req, orgId);
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await getTenantClient(ctx.tenant.orgId);
    try {
      const existing = await client.query(`SELECT id FROM issues WHERE id = $1`, [issueId]);
      if (!existing.rows.length) {
        client.release();
        return NextResponse.json({ error: "Issue not found" }, { status: 404 });
      }
      await client.query(`DELETE FROM issues WHERE id = $1`, [issueId]);
      client.release();
      return NextResponse.json({ message: "Issue deleted successfully" });
    } catch (error: any) {
      client.release();
      return NextResponse.json(
        { error: "Failed to delete issue", message: error.message },
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

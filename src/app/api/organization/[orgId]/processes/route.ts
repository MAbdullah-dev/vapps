import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { queryTenant, getTenantPool, getTenantClient } from "@/lib/db/tenant-pool";
import { cache, cacheKeys, invalidateOrgSitesListCache } from "@/lib/cache";
import { prisma } from "@/lib/prisma";
import { type Role } from "@/lib/roles";
import { hasPermission, type StoredPermissions } from "@/lib/permissions";
import { getUserAssignedProcessIds } from "@/lib/process-access";
import crypto from "crypto";

/**
 * GET /api/organization/[orgId]/processes?siteId=xxx
 * Get processes for an organization.
 * Access: Owner = all; others = only assigned process(es).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId");

    const ctx = await getRequestContext(req, orgId);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const resolvedOrgId = ctx.tenant.orgId;

    // Cache key includes userId so different roles get correct filtered results
    const cacheKey = `processes:${resolvedOrgId}:${ctx.user.id}:${siteId || "all"}`;
    const cached = cache.get<{ processes: any[] }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const org = await prisma.organization.findUnique({
      where: { id: resolvedOrgId },
      select: { ownerId: true },
    });
    const isOwner = org?.ownerId === ctx.user.id;

    const client = await getTenantClient(resolvedOrgId);

    try {
      let allowedProcessIds: string[] | null = null;

      if (!isOwner) {
        allowedProcessIds = await getUserAssignedProcessIds(client, ctx.user.id);
        if (allowedProcessIds.length === 0) {
          client.release();
          const response = { processes: [] };
          cache.set(cacheKey, response, 60 * 1000);
          return NextResponse.json(response);
        }
      }

      const baseQuery = `
        SELECT 
          p.id,
          p.name,
          p.description,
          p."siteId",
          p."createdAt",
          p."updatedAt",
          s.name as "siteName",
          s.code as "siteCode",
          s.location as "siteLocation"
        FROM processes p
        INNER JOIN sites s ON p."siteId" = s.id
      `;
      const orderClause = ` ORDER BY p."createdAt" DESC`;

      let processes: any[];

      if (isOwner) {
        if (siteId) {
          const result = await client.query(
            `${baseQuery} WHERE p."siteId" = $1 ${orderClause}`,
            [siteId]
          );
          processes = result.rows;
        } else {
          const result = await client.query(`${baseQuery} ${orderClause}`);
          processes = result.rows;
        }
      } else if (allowedProcessIds && allowedProcessIds.length > 0) {
        const placeholders = allowedProcessIds.map((_, i) => `$${i + 1}`).join(", ");
        const siteFilter =
          siteId && allowedProcessIds.length > 0
            ? ` AND p."siteId" = $${allowedProcessIds.length + 1}`
            : "";
        const args = siteId ? [...allowedProcessIds, siteId] : allowedProcessIds;
        const result = await client.query(
          `${baseQuery} WHERE p.id::text IN (${placeholders})${siteFilter} ${orderClause}`,
          args
        );
        processes = result.rows;
      } else {
        processes = [];
      }

      client.release();

      const response = { processes };
      cache.set(cacheKey, response, 60 * 1000);
      return NextResponse.json(response);
    } catch (dbError: any) {
      client.release();
      return NextResponse.json(
        { error: "Failed to fetch processes", message: dbError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error fetching processes:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organization/[orgId]/processes
 * Create a new process for a site
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const body = await req.json();
    const { name, description, siteId } = body;

    const ctx = await getRequestContext(req, orgId);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const resolvedOrgId = ctx.tenant.orgId;

    const org = await prisma.organization.findUnique({
      where: { id: resolvedOrgId },
      select: { ownerId: true, permissions: true },
    });
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }
    const isOwner = org.ownerId === ctx.user.id;
    if (!isOwner) {
      const stored = (org.permissions ?? null) as StoredPermissions | null;
      if (!hasPermission(stored, ctx.tenant.userRole as Role, "manage_processes")) {
        return NextResponse.json(
          { error: "You do not have permission to manage processes." },
          { status: 403 }
        );
      }
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Process name is required" },
        { status: 400 }
      );
    }

    if (!siteId) {
      return NextResponse.json(
        { error: "Site ID is required" },
        { status: 400 }
      );
    }

    try {
      const pool = await getTenantPool(resolvedOrgId);
      const client = await pool.connect();

      try {
        // Verify site exists
        const siteResult = await client.query(
          `SELECT id, name FROM sites WHERE id = $1`,
          [siteId]
        );

        if (siteResult.rows.length === 0) {
          return NextResponse.json(
            { error: "Site not found" },
            { status: 404 }
          );
        }

        // Insert new process
        const processId = crypto.randomUUID();
        await client.query(
          `INSERT INTO processes (id, name, description, "siteId", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, NOW(), NOW())`,
          [processId, name.trim(), description?.trim() || null, siteId]
        );

        // Fetch the created process with site information
        const processResult = await client.query(
          `SELECT 
            p.id,
            p.name,
            p.description,
            p."siteId",
            p."createdAt",
            p."updatedAt",
            s.name as "siteName",
            s.code as "siteCode",
            s.location as "siteLocation"
          FROM processes p
          INNER JOIN sites s ON p."siteId" = s.id
          WHERE p.id = $1`,
          [processId]
        );

        cache.clearPattern(`processes:${resolvedOrgId}:*`);
        cache.delete(cacheKeys.orgProcesses(resolvedOrgId));
        cache.delete(cacheKeys.orgProcesses(resolvedOrgId, siteId));
        invalidateOrgSitesListCache(resolvedOrgId);

        return NextResponse.json(
          {
            message: "Process created successfully",
            process: processResult.rows[0],
          },
          { status: 201 }
        );
      } finally {
        client.release(); // CRITICAL: Always release connection back to pool
      }
    } catch (dbError: any) {
      return NextResponse.json(
        { error: "Failed to create process", message: dbError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error creating process:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

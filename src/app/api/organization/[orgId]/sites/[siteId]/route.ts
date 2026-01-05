import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { getTenantClient } from "@/lib/db/tenant-pool";
import { cache, cacheKeys } from "@/lib/cache";

/**
 * PUT /api/organization/[orgId]/sites/[siteId]
 * Update a site
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; siteId: string }> }
) {
  try {
    const { orgId, siteId } = await params;
    const body = await req.json();
    const { siteName, location } = body;

    // Get request context (user + tenant) - single call, cached
    const ctx = await getRequestContext(req, orgId);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tenant } = ctx;

    // Only owners can update sites
    if (tenant.userRole !== "owner") {
      return NextResponse.json(
        { error: "Only organization owners can update sites" },
        { status: 403 }
      );
    }

    if (!siteName || !location) {
      return NextResponse.json(
        { error: "Site name and location are required" },
        { status: 400 }
      );
    }

    // Use tenant pool instead of new Client()
    const client = await getTenantClient(orgId);

    try {
      // Verify site exists
      const siteResult = await client.query(
        `SELECT id FROM sites WHERE id = $1`,
        [siteId]
      );

      if (siteResult.rows.length === 0) {
        client.release();
        return NextResponse.json(
          { error: "Site not found" },
          { status: 404 }
        );
      }

      // Update site
      await client.query(
        `UPDATE sites 
         SET name = $1, location = $2, "updatedAt" = NOW()
         WHERE id = $3`,
        [siteName.trim(), location.trim(), siteId]
      );

      // Fetch updated site
      const updatedSiteResult = await client.query(
        `SELECT 
          s.id,
          s.name,
          s.code,
          s.location,
          s."createdAt",
          s."updatedAt"
        FROM sites s
        WHERE s.id = $1`,
        [siteId]
      );

      // Clear cache after mutation
      cache.delete(cacheKeys.orgSites(orgId));

      client.release();

      return NextResponse.json(
        {
          message: "Site updated successfully",
          site: updatedSiteResult.rows[0],
        },
        { status: 200 }
      );
    } catch (dbError: any) {
      client.release();
      return NextResponse.json(
        { error: "Failed to update site", message: dbError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error updating site:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organization/[orgId]/sites/[siteId]
 * Delete a site
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; siteId: string }> }
) {
  try {
    const { orgId, siteId } = await params;

    // Get request context (user + tenant) - single call, cached
    const ctx = await getRequestContext(req, orgId);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tenant } = ctx;

    // Only owners can delete sites
    if (tenant.userRole !== "owner") {
      return NextResponse.json(
        { error: "Only organization owners can delete sites" },
        { status: 403 }
      );
    }

    // Use tenant pool instead of new Client()
    const client = await getTenantClient(orgId);

    try {
      // Verify site exists
      const siteResult = await client.query(
        `SELECT id FROM sites WHERE id = $1`,
        [siteId]
      );

      if (siteResult.rows.length === 0) {
        client.release();
        return NextResponse.json(
          { error: "Site not found" },
          { status: 404 }
        );
      }

      // Check if site has processes (CASCADE will handle deletion, but we can warn)
      const processesResult = await client.query(
        `SELECT COUNT(*) as count FROM processes WHERE "siteId" = $1`,
        [siteId]
      );

      const processCount = parseInt(processesResult.rows[0].count);

      // Delete site (CASCADE will delete associated processes)
      await client.query(`DELETE FROM sites WHERE id = $1`, [siteId]);

      // Clear cache after mutation
      cache.delete(cacheKeys.orgSites(orgId));

      client.release();

      return NextResponse.json(
        {
          message: "Site deleted successfully",
          deletedProcesses: processCount,
        },
        { status: 200 }
      );
    } catch (dbError: any) {
      client.release();
      return NextResponse.json(
        { error: "Failed to delete site", message: dbError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error deleting site:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

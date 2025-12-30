import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { queryTenant, getTenantPool } from "@/lib/db/tenant-pool";
import { cache, cacheKeys } from "@/lib/cache";
import crypto from "crypto";

/**
 * GET /api/organization/[orgId]/sites
 * Get all sites and their processes for an organization
 * 
 * OPTIMIZED: Uses request context to eliminate redundant master DB queries
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;

    // Get request context (user + tenant) - single call, cached
    const ctx = await getRequestContext(req, orgId);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tenant, user } = ctx;
    const userRole = tenant.userRole;

    // Check cache first (60s TTL)
    const cacheKey = cacheKeys.orgSites(orgId);
    const cached = cache.get<{ sites: any[]; userRole: string; organization: { id: string; name: string } }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    try {
      // OPTIMIZED: Single query with LEFT JOIN using pooled connection
      // This eliminates N+1 query problem (was making 1 + N queries, now just 1)
      const rows = await queryTenant<any>(orgId, `
        SELECT 
          s.id,
          s.name,
          s.code,
          s.location,
          s."createdAt",
          s."updatedAt",
          p.id as "processId",
          p.name as "processName",
          p."createdAt" as "processCreatedAt"
        FROM sites s
        LEFT JOIN processes p ON p."siteId" = s.id
        ORDER BY s."createdAt" ASC, p.name ASC
      `).catch((error) => {
        console.error("[Sites API] Database query error:", error);
        throw error;
      });

      // Group processes by site
      const sitesMap = new Map<string, any>();
      
      rows.forEach((row: any) => {
        const siteId = row.id;
        
        if (!sitesMap.has(siteId)) {
          sitesMap.set(siteId, {
            id: row.id,
            name: row.name,
            code: row.code,
            location: row.location,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            processes: [],
          });
        }
        
        // Add process if it exists (LEFT JOIN may return null)
        if (row.processId) {
          sitesMap.get(siteId)!.processes.push({
            id: row.processId,
            name: row.processName,
            createdAt: row.processCreatedAt,
          });
        }
      });

      const sitesWithProcesses = Array.from(sitesMap.values());

      const response = {
        sites: sitesWithProcesses,
        userRole,
        organization: {
          id: tenant.orgId,
          name: tenant.orgName,
        },
      };

      // Cache the response for 60 seconds
      cache.set(cacheKey, response, 60 * 1000);

      return NextResponse.json(response);
    } catch (dbError: any) {
      console.error("[Sites API] Database error details:", {
        message: dbError.message,
        code: dbError.code,
        stack: dbError.stack,
        orgId,
        hasDatabase: !!tenant.connectionString,
        databaseName: tenant.dbName,
      });
      
      // Return detailed error in development, generic in production
      return NextResponse.json(
        { 
          error: "Failed to fetch sites", 
          message: dbError.message,
          ...(process.env.NODE_ENV === "development" && {
            details: {
              code: dbError.code,
              stack: dbError.stack,
              orgId,
            },
          }),
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error fetching sites:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organization/[orgId]/sites
 * Create a new site (only for owners)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const body = await req.json();
    const { siteName, location } = body;

    // Get request context (user + tenant) - single call, cached
    const ctx = await getRequestContext(req, orgId);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tenant } = ctx;

    // Only owners can create sites
    if (tenant.userRole !== "owner") {
      return NextResponse.json(
        { error: "Only organization owners can create sites" },
        { status: 403 }
      );
    }

    if (!siteName || !location) {
      return NextResponse.json(
        { error: "Site name and location are required" },
        { status: 400 }
      );
    }

    try {
      // Use pooled connection
      const pool = await getTenantPool(orgId);
      const client = await pool.connect();

      try {
        // Auto-generate site code: Get count of existing sites for this organization
        const countResult = await client.query(`SELECT COUNT(*) as count FROM sites`);
        const count = parseInt(countResult.rows[0].count) + 1;
        const finalSiteCode = `S${String(count).padStart(3, '0')}`;

        // Check if site code already exists (shouldn't happen, but safety check)
        const existingSite = await client.query(
          `SELECT id FROM sites WHERE code = $1`,
          [finalSiteCode]
        );

        if (existingSite.rows.length > 0) {
          return NextResponse.json(
            { error: "Site code already exists" },
            { status: 409 }
          );
        }

        // Insert new site
        const siteId = crypto.randomUUID();
        await client.query(
          `INSERT INTO sites (id, name, code, location, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, NOW(), NOW())`,
          [siteId, siteName, finalSiteCode, location]
        );

        // Clear cache after mutation
        cache.delete(cacheKeys.orgSites(orgId));

        return NextResponse.json(
          {
            message: "Site created successfully",
            site: {
              id: siteId,
              name: siteName,
              code: finalSiteCode,
              location,
              processes: [],
            },
          },
          { status: 201 }
        );
      } finally {
        client.release(); // CRITICAL: Always release connection back to pool
      }
    } catch (dbError: any) {
      return NextResponse.json(
        { error: "Failed to create site", message: dbError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error creating site:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

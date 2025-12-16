import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-server-session";
import { prisma } from "@/lib/prisma";
import { Client } from "pg";
import crypto from "crypto";

/**
 * GET /api/organization/[orgId]/sites
 * Get all sites and their processes for an organization
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = await params;

    // Get organization and verify user has access
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        database: true,
        users: {
          where: { userId: user.id },
        },
      },
    });

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Check if user has access
    const hasAccess = org.ownerId === user.id || org.users.length > 0;
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!org.database) {
      return NextResponse.json(
        { error: "Tenant database not found" },
        { status: 404 }
      );
    }

    // Get user role
    const userRole = org.ownerId === user.id ? "owner" : org.users[0]?.role || "member";

    // Connect to tenant database
    const client = new Client({
      connectionString: org.database.connectionString,
      ssl: { rejectUnauthorized: false },
    });

    try {
      await client.connect();

      // Get all sites with their processes
      const sitesResult = await client.query(`
        SELECT 
          s.id,
          s.name,
          s.code,
          s.location,
          s."createdAt",
          s."updatedAt"
        FROM sites s
        ORDER BY s."createdAt" ASC
      `);

      // Get processes for each site
      const sitesWithProcesses = await Promise.all(
        sitesResult.rows.map(async (site: any) => {
          const processesResult = await client.query(
            `SELECT id, name, "createdAt" FROM processes WHERE "siteId" = $1 ORDER BY name ASC`,
            [site.id]
          );
          return {
            ...site,
            processes: processesResult.rows,
          };
        })
      );

      await client.end();

      return NextResponse.json({
        sites: sitesWithProcesses,
        userRole,
        organization: {
          id: org.id,
          name: org.name,
        },
      });
    } catch (dbError: any) {
      await client.end();
      return NextResponse.json(
        { error: "Failed to fetch sites", message: dbError.message },
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
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = await params;

    const body = await req.json();
    const { siteName, location } = body;

    if (!siteName || !location) {
      return NextResponse.json(
        { error: "Site name and location are required" },
        { status: 400 }
      );
    }

    // Get organization and verify user is owner
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { database: true },
    });

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Check if user is owner
    if (org.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Only organization owners can create sites" },
        { status: 403 }
      );
    }

    if (!org.database) {
      return NextResponse.json(
        { error: "Tenant database not found" },
        { status: 404 }
      );
    }

    // Connect to tenant database
    const client = new Client({
      connectionString: org.database.connectionString,
      ssl: { rejectUnauthorized: false },
    });

    try {
      await client.connect();

      // Auto-generate site code: Get count of existing sites for this organization
      // Each organization has its own tenant database, so count starts from 1 for each org
      const countResult = await client.query(`SELECT COUNT(*) as count FROM sites`);
      const count = parseInt(countResult.rows[0].count) + 1;
      const finalSiteCode = `S${String(count).padStart(3, '0')}`;

      // Check if site code already exists (shouldn't happen, but safety check)
      const existingSite = await client.query(
        `SELECT id FROM sites WHERE code = $1`,
        [finalSiteCode]
      );

      if (existingSite.rows.length > 0) {
        await client.end();
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

      await client.end();

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
    } catch (dbError: any) {
      await client.end();
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

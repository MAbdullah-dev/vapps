import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-server-session";
import { prisma } from "@/lib/prisma";
import { Client } from "pg";
import crypto from "crypto";

/**
 * GET /api/organization/[orgId]/processes?siteId=xxx
 * Get all processes for an organization, optionally filtered by siteId
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
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId");

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

    // Connect to tenant database
    const client = new Client({
      connectionString: org.database.connectionString,
      ssl: { rejectUnauthorized: false },
    });

    try {
      await client.connect();

      // OPTIMIZED: Single query with JOIN, using parameterized query for better performance
      const processesQuery = siteId
        ? `
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
          WHERE p."siteId" = $1
          ORDER BY p."createdAt" DESC
        `
        : `
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
          ORDER BY p."createdAt" DESC
        `;

      const processesResult = await client.query(
        processesQuery,
        siteId ? [siteId] : undefined
      );

      await client.end();

      return NextResponse.json({
        processes: processesResult.rows,
      });
    } catch (dbError: any) {
      await client.end();
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
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = await params;
    const body = await req.json();
    const { name, description, siteId } = body;

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

    // Connect to tenant database
    const client = new Client({
      connectionString: org.database.connectionString,
      ssl: { rejectUnauthorized: false },
    });

    try {
      await client.connect();

      // Verify site exists
      const siteResult = await client.query(
        `SELECT id, name FROM sites WHERE id = $1`,
        [siteId]
      );

      if (siteResult.rows.length === 0) {
        await client.end();
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

      await client.end();

      return NextResponse.json(
        {
          message: "Process created successfully",
          process: processResult.rows[0],
        },
        { status: 201 }
      );
    } catch (dbError: any) {
      await client.end();
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

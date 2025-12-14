import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-server-session";
import { prisma } from "@/lib/prisma";
import { Client } from "pg";
import crypto from "crypto";

/**
 * GET /api/organization/[orgId]/metadata?type=titles|tags|sources
 * Get metadata (titles, tags, or sources) for an organization
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
    const type = searchParams.get("type"); // titles, tags, or sources

    if (!type || !["titles", "tags", "sources"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be 'titles', 'tags', or 'sources'" },
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

      const tableName = `issue_${type}`;
      const result = await client.query(
        `SELECT id, name, "createdAt" FROM ${tableName} ORDER BY name ASC`
      );

      await client.end();

      return NextResponse.json({
        [type]: result.rows.map((row: any) => row.name),
      });
    } catch (dbError: any) {
      await client.end();
      return NextResponse.json(
        { error: `Failed to fetch ${type}`, message: dbError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error(`Error fetching ${type}:`, error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organization/[orgId]/metadata?type=titles|tags|sources
 * Add a new metadata value (title, tag, or source)
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
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const body = await req.json();
    const { name } = body;

    if (!type || !["titles", "tags", "sources"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be 'titles', 'tags', or 'sources'" },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
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

      const tableName = `issue_${type}`;
      const trimmedName = name.trim();

      // Check if already exists
      const existing = await client.query(
        `SELECT id FROM ${tableName} WHERE name = $1`,
        [trimmedName]
      );

      if (existing.rows.length > 0) {
        await client.end();
        return NextResponse.json(
          {
            message: `${type.slice(0, -1)} already exists`,
            name: trimmedName,
          },
          { status: 200 }
        );
      }

      // Insert new metadata
      const id = crypto.randomUUID();
      await client.query(
        `INSERT INTO ${tableName} (id, name, "createdAt")
         VALUES ($1, $2, NOW())`,
        [id, trimmedName]
      );

      await client.end();

      return NextResponse.json(
        {
          message: `${type.slice(0, -1)} added successfully`,
          name: trimmedName,
        },
        { status: 201 }
      );
    } catch (dbError: any) {
      await client.end();
      return NextResponse.json(
        { error: `Failed to add ${type}`, message: dbError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error(`Error adding ${type}:`, error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

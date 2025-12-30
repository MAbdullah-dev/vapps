import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { getTenantClient } from "@/lib/db/tenant-pool";

/**
 * PUT /api/organization/[orgId]/processes/[processId]
 * Update an existing process
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; processId: string }> }
) {
  try {
    const { orgId, processId } = await params;
    const body = await req.json();
    const { name, description } = body;

    // Get request context (user + tenant) - single call, cached
    const ctx = await getRequestContext(req, orgId);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Process name is required" },
        { status: 400 }
      );
    }

    // Use tenant pool instead of new Client()
    const client = await getTenantClient(orgId);

    try {

      // Verify process exists
      const processResult = await client.query(
        `SELECT id, name, description, "siteId" FROM processes WHERE id = $1`,
        [processId]
      );

      if (processResult.rows.length === 0) {
        client.release();
        return NextResponse.json(
          { error: "Process not found" },
          { status: 404 }
        );
      }

      // Update process
      await client.query(
        `UPDATE processes 
         SET name = $1, description = $2, "updatedAt" = NOW()
         WHERE id = $3`,
        [name.trim(), description?.trim() || null, processId]
      );

      // Fetch the updated process with site information
      const updatedProcessResult = await client.query(
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

      client.release();

      return NextResponse.json(
        {
          message: "Process updated successfully",
          process: updatedProcessResult.rows[0],
        },
        { status: 200 }
      );
    } catch (dbError: any) {
      client.release();
      return NextResponse.json(
        { error: "Failed to update process", message: dbError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error updating process:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

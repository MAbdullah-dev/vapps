/**
 * Issue Verification API Route
 * 
 * Handles marking issues as effective (with closure data) or ineffective (with reassignment data)
 */

import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { getTenantClient } from "@/lib/db/tenant-pool";
import crypto from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; processId: string; issueId: string }> }
) {
  let client;
  try {
    const resolvedParams = await params;
    const { orgId, processId, issueId } = resolvedParams;
    
    // Get request context (user + tenant) - single call, cached
    const ctx = await getRequestContext(req, orgId);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!orgId || !processId || !issueId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      verificationStatus, // 'effective' or 'ineffective'
      closureComments,
      verificationFiles,
      closeOutDate,
      verificationDate,
      signature,
      kpiScore,
      // For ineffective/reassignment
      reassignedTo,
      reassignmentInstructions,
      reassignmentDueDate,
      reassignmentFiles,
    } = body;

    if (!verificationStatus || !['effective', 'ineffective'].includes(verificationStatus)) {
      return NextResponse.json(
        { error: "verificationStatus must be 'effective' or 'ineffective'" },
        { status: 400 }
      );
    }

    // Get tenant database client
    client = await getTenantClient(orgId);

    // Verify issue exists and is in 'in-review' status
    const issueResult = await client.query(
      `SELECT id, status, "processId" FROM issues WHERE id = $1 AND "processId" = $2`,
      [issueId, processId]
    );

    if (issueResult.rows.length === 0) {
      await client.end();
      return NextResponse.json(
        { error: "Issue not found" },
        { status: 404 }
      );
    }

    const issue = issueResult.rows[0];
    if (issue.status !== 'in-review') {
      await client.end();
      return NextResponse.json(
        { error: "Issue must be in 'in-review' status to verify" },
        { status: 400 }
      );
    }

    // Prepare verification data
    const verificationData: any = {
      id: crypto.randomUUID(),
      issueId,
      verificationStatus,
      closureComments: closureComments || null,
      verificationFiles: JSON.stringify(verificationFiles || []),
      closeOutDate: closeOutDate ? new Date(closeOutDate) : null,
      verificationDate: verificationDate ? new Date(verificationDate) : new Date(),
      signature: signature || null,
      kpiScore: kpiScore || 0,
      reassignedTo: reassignedTo || null,
      reassignmentInstructions: reassignmentInstructions || null,
      reassignmentDueDate: reassignmentDueDate ? new Date(reassignmentDueDate) : null,
      reassignmentFiles: JSON.stringify(reassignmentFiles || []),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Insert or update verification data (upsert)
    await client.query(
      `INSERT INTO "issue_verifications" (
        "id", "issueId", "verificationStatus", "closureComments", 
        "verificationFiles", "closeOutDate", "verificationDate", 
        "signature", "kpiScore", "reassignedTo", "reassignmentInstructions",
        "reassignmentDueDate", "reassignmentFiles", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      )
      ON CONFLICT ("issueId") 
      DO UPDATE SET
        "verificationStatus" = EXCLUDED."verificationStatus",
        "closureComments" = EXCLUDED."closureComments",
        "verificationFiles" = EXCLUDED."verificationFiles",
        "closeOutDate" = EXCLUDED."closeOutDate",
        "verificationDate" = EXCLUDED."verificationDate",
        "signature" = EXCLUDED."signature",
        "kpiScore" = EXCLUDED."kpiScore",
        "reassignedTo" = EXCLUDED."reassignedTo",
        "reassignmentInstructions" = EXCLUDED."reassignmentInstructions",
        "reassignmentDueDate" = EXCLUDED."reassignmentDueDate",
        "reassignmentFiles" = EXCLUDED."reassignmentFiles",
        "updatedAt" = EXCLUDED."updatedAt"`,
      [
        verificationData.id,
        verificationData.issueId,
        verificationData.verificationStatus,
        verificationData.closureComments,
        verificationData.verificationFiles,
        verificationData.closeOutDate,
        verificationData.verificationDate,
        verificationData.signature,
        verificationData.kpiScore,
        verificationData.reassignedTo,
        verificationData.reassignmentInstructions,
        verificationData.reassignmentDueDate,
        verificationData.reassignmentFiles,
        verificationData.createdAt,
        verificationData.updatedAt,
      ]
    );

    // Update issue status based on verification
    if (verificationStatus === 'effective') {
      // Mark as done
      await client.query(
        `UPDATE issues SET status = 'done', "updatedAt" = NOW() WHERE id = $1`,
        [issueId]
      );
    } else if (verificationStatus === 'ineffective') {
      // Reassign: set status back to 'in-progress' and update assignee/due date
      const updateFields: string[] = ['status = $2', '"updatedAt" = NOW()'];
      const updateValues: any[] = [issueId, 'in-progress'];
      let paramIndex = 3;

      if (reassignedTo) {
        updateFields.push(`assignee = $${paramIndex}`);
        updateValues.push(reassignedTo);
        paramIndex++;
      }

      if (reassignmentDueDate) {
        // Note: issues table might not have dueDate field, adjust if needed
        // For now, we'll just update status and assignee
      }

      await client.query(
        `UPDATE issues SET ${updateFields.join(', ')} WHERE id = $1`,
        updateValues
      );
    }

    await client.end();

    return NextResponse.json({
      success: true,
      message: verificationStatus === 'effective' 
        ? "Issue marked as effective and closed"
        : "Issue marked as ineffective and reassigned",
    });
  } catch (error: any) {
    console.error("Error saving verification:", error);
    if (client) {
      try {
        await client.end();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    return NextResponse.json(
      { error: error.message || "Failed to save verification" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; processId: string; issueId: string }> }
) {
  let client;
  try {
    const resolvedParams = await params;
    const { orgId, issueId } = resolvedParams;
    
    // Get request context (user + tenant) - single call, cached
    const ctx = await getRequestContext(req, orgId);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!orgId || !issueId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Get tenant database client
    client = await getTenantClient(orgId);

    // Fetch verification data for this issue
    const result = await client.query(
      `SELECT * FROM "issue_verifications" WHERE "issueId" = $1`,
      [issueId]
    );

    await client.end();

    if (result.rows.length === 0) {
      return NextResponse.json({ verification: null });
    }

    const verification = result.rows[0];
    // Parse JSONB fields
    if (verification.verificationFiles) {
      verification.verificationFiles = typeof verification.verificationFiles === 'string' 
        ? JSON.parse(verification.verificationFiles)
        : verification.verificationFiles;
    }
    if (verification.reassignmentFiles) {
      verification.reassignmentFiles = typeof verification.reassignmentFiles === 'string'
        ? JSON.parse(verification.reassignmentFiles)
        : verification.reassignmentFiles;
    }

    return NextResponse.json({ verification });
  } catch (error: any) {
    console.error("Error fetching verification:", error);
    if (client) {
      try {
        await client.end();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    return NextResponse.json(
      { error: error.message || "Failed to fetch verification" },
      { status: 500 }
    );
  }
}

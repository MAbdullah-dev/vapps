import { NextRequest, NextResponse } from "next/server";
import { getRequestContextAndError } from "@/lib/request-context";
import { withTenantConnection } from "@/lib/db/connection-helper";
import {
  documentHasLockedPin,
  viewerNeedsDocumentWorkflowPinGate,
  workflowPinMatches,
} from "@/lib/documentWorkflowPin";

/**
 * Confirms the document PIN for Process Owner / Approver before showing Review or Approval UI.
 * Document initiator does not need this (API returns gate: false for them).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params;
    const { context, errorResponse } = await getRequestContextAndError(req, orgId);
    if (errorResponse) return errorResponse;

    const connectionString = context.tenant.connectionString;
    if (!connectionString) {
      return NextResponse.json({ error: "Tenant database not found" }, { status: 404 });
    }

    const body = (await req.json().catch(() => ({}))) as { recordId?: string; pin?: string };
    const recordId = String(body.recordId ?? "").trim();
    const pin = String(body.pin ?? "");
    if (!recordId) {
      return NextResponse.json({ error: "recordId is required" }, { status: 400 });
    }

    let notFound = false;
    let denied = false;

    await withTenantConnection(connectionString, async (client) => {
      const r = await client.query<{
        form_data: unknown;
        wizard_data: unknown;
        created_by_user_id: string | null;
        created_by_user_name: string | null;
      }>(
        `SELECT form_data, wizard_data, created_by_user_id, created_by_user_name
         FROM document_module_records WHERE id::text = $1::text`,
        [recordId]
      );
      if (r.rows.length === 0) {
        notFound = true;
        return;
      }
      const row = r.rows[0];
      const fd =
        typeof row.form_data === "object" && row.form_data !== null && !Array.isArray(row.form_data)
          ? (row.form_data as Record<string, unknown>)
          : {};

      const needGate = viewerNeedsDocumentWorkflowPinGate({
        viewerId: context.user.id,
        viewerName: context.user.name,
        formData: fd,
        wizard: row.wizard_data,
        rowCreatedByUserId: row.created_by_user_id,
        rowCreatedByUserName: row.created_by_user_name,
      });

      if (!needGate || !documentHasLockedPin(row.wizard_data)) {
        return;
      }

      if (!workflowPinMatches(row.wizard_data, pin)) {
        denied = true;
      }
    });

    if (notFound) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    if (denied) {
      return NextResponse.json({ error: "Invalid PIN." }, { status: 403 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("verify-workflow-pin:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}

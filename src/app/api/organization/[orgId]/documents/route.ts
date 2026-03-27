import { NextRequest, NextResponse } from "next/server";
import { getRequestContextAndError } from "@/lib/request-context";
import { withTenantConnection } from "@/lib/db/connection-helper";

type SaveDocumentBody = {
  status?: "draft" | "submitted";
  saveMode?: "create" | "edit-draft" | "revision" | "revision-draft";
  recordId?: string;
  payload?: {
    savedAt?: string;
    previewDocRef?: string;
    formData?: unknown;
    wizard?: unknown;
  };
};

type UpdateWorkflowBody = {
  recordId?: string;
  action?: "review-submit" | "approve";
  comments?: string;
  decision?: "effective" | "ineffective" | null;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const { context, errorResponse } = await getRequestContextAndError(req, orgId);
    if (errorResponse) return errorResponse;

    const connectionString = context.tenant.connectionString;
    if (!connectionString) {
      return NextResponse.json({ error: "Tenant database not found" }, { status: 404 });
    }

    const requestedId = req.nextUrl.searchParams.get("id");
    const requestedLifecycle = req.nextUrl.searchParams.get("lifecycle");
    const includeAll = req.nextUrl.searchParams.get("includeAll") === "1";

    let rows: Array<{
      id: string;
      status: "draft" | "submitted";
      preview_doc_ref: string;
      form_data: unknown;
      wizard_data: unknown;
      lifecycle_status: "active" | "obsolete";
      supersedes_record_id: string | null;
      superseded_by_record_id: string | null;
      workflow_status: "draft" | "in_review" | "in_approval" | "approved";
      created_by_user_name: string | null;
      created_at: string;
      updated_at: string;
    }> = [];

    await withTenantConnection(connectionString, async (client) => {
      const tableCheck = await client.query(
        `SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'document_module_records'`
      );

      if (tableCheck.rows.length === 0) {
        throw new Error("document_module_records table does not exist. Run tenant migration 020.");
      }

      const lifecycleColCheck = await client.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'document_module_records' AND column_name = 'lifecycle_status'`
      );
      const supersedesColCheck = await client.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'document_module_records' AND column_name = 'supersedes_record_id'`
      );
      const supersededByColCheck = await client.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'document_module_records' AND column_name = 'superseded_by_record_id'`
      );
      const hasLifecycle = lifecycleColCheck.rows.length > 0;
      const hasSupersedes = supersedesColCheck.rows.length > 0;
      const hasSupersededBy = supersededByColCheck.rows.length > 0;
      const workflowColCheck = await client.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'document_module_records' AND column_name = 'workflow_status'`
      );
      const hasWorkflow = workflowColCheck.rows.length > 0;

      const result = await client.query<{
        id: string;
        status: "draft" | "submitted";
        preview_doc_ref: string;
        form_data: unknown;
        wizard_data: unknown;
        lifecycle_status: "active" | "obsolete";
        supersedes_record_id: string | null;
        superseded_by_record_id: string | null;
        workflow_status: "draft" | "in_review" | "in_approval" | "approved";
        created_by_user_name: string | null;
        created_at: string;
        updated_at: string;
      }>(
        `SELECT
          id::text,
          status,
          preview_doc_ref,
          form_data,
          wizard_data,
          ${hasLifecycle ? "lifecycle_status" : "'active'::text AS lifecycle_status"},
          ${hasSupersedes ? "supersedes_record_id::text" : "NULL::text AS supersedes_record_id"},
          ${hasSupersededBy ? "superseded_by_record_id::text" : "NULL::text AS superseded_by_record_id"},
          ${hasWorkflow ? "workflow_status" : "'draft'::text AS workflow_status"},
          created_by_user_name,
          created_at::text,
          updated_at::text
         FROM document_module_records
         WHERE ($1::text IS NULL OR id::text = $1::text)
           AND (
             $2::text IS NULL
            OR (${hasLifecycle ? "lifecycle_status" : "'active'::text"}) = $2::text
             OR $3::boolean = true
           )
         ORDER BY updated_at DESC`,
        [requestedId, requestedLifecycle, includeAll]
      );

      rows = result.rows;
    });

    return NextResponse.json({ records: rows }, { status: 200 });
  } catch (error) {
    console.error("Error fetching document module records:", error);
    return NextResponse.json({ error: "Failed to fetch document records" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const { context, errorResponse } = await getRequestContextAndError(req, orgId);
    if (errorResponse) return errorResponse;

    const connectionString = context.tenant.connectionString;
    if (!connectionString) {
      return NextResponse.json({ error: "Tenant database not found" }, { status: 404 });
    }

    const body = (await req.json().catch(() => ({}))) as SaveDocumentBody;
    const status = body.status === "submitted" ? "submitted" : "draft";
    const saveMode = body.saveMode ?? "create";
    const sourceRecordId = String(body.recordId ?? "").trim();
    const payload = body.payload ?? {};

    const previewDocRef = String(payload.previewDocRef ?? "").trim();
    if (!previewDocRef) {
      return NextResponse.json({ error: "previewDocRef is required" }, { status: 400 });
    }

    const formData = payload.formData ?? {};
    const wizard = payload.wizard ?? {};

    let savedRecordId = "";
    let lifecycleStatus: "active" | "obsolete" = "active";
    let workflowStatus: "draft" | "in_review" | "in_approval" | "approved" = "draft";

    await withTenantConnection(connectionString, async (client) => {
      const tableCheck = await client.query(
        `SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'document_module_records'`
      );

      if (tableCheck.rows.length === 0) {
        throw new Error("document_module_records table does not exist. Run tenant migration 020.");
      }

      // Ensure new lifecycle columns exist even when migration 021 wasn't run yet.
      await client.query(
        `ALTER TABLE document_module_records
           ADD COLUMN IF NOT EXISTS lifecycle_status VARCHAR(20) NOT NULL DEFAULT 'active'`
      );
      await client.query(
        `ALTER TABLE document_module_records
           ADD COLUMN IF NOT EXISTS supersedes_record_id UUID NULL`
      );
      await client.query(
        `ALTER TABLE document_module_records
           ADD COLUMN IF NOT EXISTS superseded_by_record_id UUID NULL`
      );
      await client.query(
        `ALTER TABLE document_module_records
           ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(20) NOT NULL DEFAULT 'draft'`
      );
      await client.query(
        `CREATE TABLE IF NOT EXISTS document_module_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          record_id UUID NOT NULL REFERENCES document_module_records(id) ON DELETE CASCADE,
          action VARCHAR(50) NOT NULL,
          actor_user_id TEXT NOT NULL,
          actor_user_name TEXT NULL,
          details JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`
      );

      if (saveMode === "edit-draft" && sourceRecordId) {
        const updated = await client.query<{
          id: string;
          lifecycle_status: "active" | "obsolete";
          workflow_status: "draft" | "in_review" | "in_approval" | "approved";
        }>(
          `UPDATE document_module_records
           SET
             status = $2,
             preview_doc_ref = $3,
             form_data = $4::jsonb,
             wizard_data = $5::jsonb,
             workflow_status = 'draft',
             updated_by_user_id = $6,
             updated_by_user_name = $7,
             updated_at = NOW()
           WHERE id::text = $1::text
           RETURNING id::text, lifecycle_status, workflow_status`,
          [
            sourceRecordId,
            "draft",
            previewDocRef,
            JSON.stringify(formData),
            JSON.stringify(wizard),
            context.user.id,
            context.user.name,
          ]
        );
        savedRecordId = updated.rows[0]?.id ?? "";
        lifecycleStatus = updated.rows[0]?.lifecycle_status ?? "active";
        workflowStatus = updated.rows[0]?.workflow_status ?? "draft";
        if (savedRecordId) {
          await client.query(
            `INSERT INTO document_module_history (record_id, action, actor_user_id, actor_user_name, details)
             VALUES ($1::uuid, 'draft_updated', $2, $3, $4::jsonb)`,
            [savedRecordId, context.user.id, context.user.name, JSON.stringify({ saveMode })]
          );
        }
        return;
      }

      if ((saveMode === "revision" || saveMode === "revision-draft") && sourceRecordId) {
        const versionMatch = previewDocRef.match(/\/v(\d+)$/i);
        const nextVersion = versionMatch ? Number(versionMatch[1]) + 1 : 2;
        const nextPreviewDocRef = versionMatch
          ? previewDocRef.replace(/\/v\d+$/i, `/v${nextVersion}`)
          : `${previewDocRef}/v${nextVersion}`;

        const inserted = await client.query<{ id: string }>(
          `INSERT INTO document_module_records (
            status,
            preview_doc_ref,
            form_data,
            wizard_data,
            lifecycle_status,
            supersedes_record_id,
            created_by_user_id,
            created_by_user_name,
            updated_by_user_id,
            updated_by_user_name
          ) VALUES ($1, $2, $3::jsonb, $4::jsonb, 'active', $5::uuid, $6, $7, $8, $9)
          RETURNING id::text`,
          [
            saveMode === "revision" ? "submitted" : "draft",
            nextPreviewDocRef,
            JSON.stringify(formData),
            JSON.stringify(wizard),
            sourceRecordId,
            context.user.id,
            context.user.name,
            context.user.id,
            context.user.name,
          ]
        );

        const newId = inserted.rows[0]?.id ?? "";
        if (newId) {
          await client.query(
            `UPDATE document_module_records
             SET workflow_status = $2
             WHERE id::text = $1::text`,
            [newId, saveMode === "revision" ? "in_review" : "draft"]
          );
          await client.query(
            `INSERT INTO document_module_history (record_id, action, actor_user_id, actor_user_name, details)
             VALUES ($1::uuid, 'revision_created', $2, $3, $4::jsonb)`,
            [
              newId,
              context.user.id,
              context.user.name,
              JSON.stringify({ sourceRecordId, revisionType: saveMode }),
            ]
          );
        }
        savedRecordId = newId;
        lifecycleStatus = "active";
        workflowStatus = saveMode === "revision" ? "in_review" : "draft";
        return;
      }

      const result = await client.query<{
        id: string;
        lifecycle_status: "active" | "obsolete";
        workflow_status: "draft" | "in_review" | "in_approval" | "approved";
      }>(
        `INSERT INTO document_module_records (
          status,
          preview_doc_ref,
          form_data,
          wizard_data,
          lifecycle_status,
          workflow_status,
          created_by_user_id,
          created_by_user_name,
          updated_by_user_id,
          updated_by_user_name
        ) VALUES ($1, $2, $3::jsonb, $4::jsonb, 'active', $5, $6, $7, $8, $9)
        RETURNING id::text, lifecycle_status, workflow_status`,
        [
          status,
          previewDocRef,
          JSON.stringify(formData),
          JSON.stringify(wizard),
          status === "submitted" ? "in_review" : "draft",
          context.user.id,
          context.user.name,
          context.user.id,
          context.user.name,
        ]
      );

      savedRecordId = result.rows[0]?.id ?? "";
      lifecycleStatus = result.rows[0]?.lifecycle_status ?? "active";
      workflowStatus = result.rows[0]?.workflow_status ?? "draft";
      if (savedRecordId) {
        await client.query(
          `INSERT INTO document_module_history (record_id, action, actor_user_id, actor_user_name, details)
           VALUES ($1::uuid, $2, $3, $4, $5::jsonb)`,
          [
            savedRecordId,
            status === "submitted" ? "submitted_for_review" : "draft_created",
            context.user.id,
            context.user.name,
            JSON.stringify({ saveMode }),
          ]
        );
      }
    });

    return NextResponse.json(
      {
        ok: true,
        id: savedRecordId,
        status,
        lifecycleStatus,
        workflowStatus,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error saving document module record:", error);
    return NextResponse.json({ error: "Failed to save document record" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const { context, errorResponse } = await getRequestContextAndError(req, orgId);
    if (errorResponse) return errorResponse;

    const connectionString = context.tenant.connectionString;
    if (!connectionString) {
      return NextResponse.json({ error: "Tenant database not found" }, { status: 404 });
    }

    const body = (await req.json().catch(() => ({}))) as UpdateWorkflowBody;
    const recordId = String(body.recordId ?? "").trim();
    const action = body.action;
    if (!recordId || !action) {
      return NextResponse.json({ error: "recordId and action are required" }, { status: 400 });
    }

    let workflowStatus: "draft" | "in_review" | "in_approval" | "approved" = "draft";

    await withTenantConnection(connectionString, async (client) => {
      if (action === "review-submit") {
        const updated = await client.query<{ workflow_status: "in_approval" }>(
          `UPDATE document_module_records
           SET workflow_status = 'in_approval',
               reviewed_by_user_id = $2,
               reviewed_by_user_name = $3,
               reviewed_at = NOW(),
               updated_by_user_id = $2,
               updated_by_user_name = $3,
               updated_at = NOW()
           WHERE id::text = $1::text
           RETURNING workflow_status`,
          [recordId, context.user.id, context.user.name]
        );
        workflowStatus = (updated.rows[0]?.workflow_status as "in_approval") ?? "in_approval";
        await client.query(
          `INSERT INTO document_module_history (record_id, action, actor_user_id, actor_user_name, details)
           VALUES ($1::uuid, 'review_submitted', $2, $3, $4::jsonb)`,
          [
            recordId,
            context.user.id,
            context.user.name,
            JSON.stringify({ comments: body.comments ?? "", decision: body.decision ?? null }),
          ]
        );
        return;
      }

      const approved = await client.query<{ supersedes_record_id: string | null; workflow_status: "approved" }>(
        `UPDATE document_module_records
         SET workflow_status = 'approved',
             approved_by_user_id = $2,
             approved_by_user_name = $3,
             approved_at = NOW(),
             updated_by_user_id = $2,
             updated_by_user_name = $3,
             updated_at = NOW()
         WHERE id::text = $1::text
         RETURNING supersedes_record_id::text, workflow_status`,
        [recordId, context.user.id, context.user.name]
      );

      const supersedes = approved.rows[0]?.supersedes_record_id ?? null;
      workflowStatus = (approved.rows[0]?.workflow_status as "approved") ?? "approved";

      if (supersedes) {
        await client.query(
          `UPDATE document_module_records
           SET lifecycle_status = 'obsolete',
               superseded_by_record_id = $2::uuid,
               updated_by_user_id = $3,
               updated_by_user_name = $4,
               updated_at = NOW()
           WHERE id::text = $1::text`,
          [supersedes, recordId, context.user.id, context.user.name]
        );
      }

      await client.query(
        `INSERT INTO document_module_history (record_id, action, actor_user_id, actor_user_name, details)
         VALUES ($1::uuid, 'approved', $2, $3, $4::jsonb)`,
        [
          recordId,
          context.user.id,
          context.user.name,
          JSON.stringify({ comments: body.comments ?? "", decision: body.decision ?? null }),
        ]
      );
    });

    return NextResponse.json({ ok: true, workflowStatus }, { status: 200 });
  } catch (error) {
    console.error("Error updating document workflow:", error);
    return NextResponse.json({ error: "Failed to update workflow" }, { status: 500 });
  }
}

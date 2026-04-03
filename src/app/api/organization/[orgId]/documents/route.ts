import { NextRequest, NextResponse } from "next/server";
import { getRequestContextAndError } from "@/lib/request-context";
import { withTenantConnection } from "@/lib/db/connection-helper";
import { documentActorMatches } from "@/lib/utils";

type RequestUser = { id: string; name: string | null };

function normalizeDocumentFormData(
  formData: unknown,
  user: RequestUser,
  opts?: { clearCorrectionOnSubmit?: boolean }
): Record<string, unknown> {
  const fd =
    typeof formData === "object" && formData !== null && !Array.isArray(formData)
      ? { ...(formData as Record<string, unknown>) }
      : {};
  if (!fd.createdByUserId) fd.createdByUserId = user.id;
  if (fd.createdByUserName == null || fd.createdByUserName === "")
    fd.createdByUserName = user.name ?? "";
  if (opts?.clearCorrectionOnSubmit) {
    fd.correctionPhase = "none";
  } else if (fd.correctionPhase == null || fd.correctionPhase === "") {
    fd.correctionPhase = "none";
  }
  return fd;
}

function mergeFormDataCorrection(
  existing: unknown,
  phase: "awaiting_creator_after_review" | "awaiting_reviewer_after_approval"
): Record<string, unknown> {
  const base =
    typeof existing === "object" && existing !== null && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  base.correctionPhase = phase;
  return base;
}

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
  action?: "review-submit" | "review-return" | "approval-return" | "approve";
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
      created_by_user_id: string | null;
      created_by_user_name: string | null;
      reviewed_by_user_name: string | null;
      reviewed_at: string | null;
      created_at: string;
      updated_at: string;
    }> = [];

    let reviewReturnNotice: {
      comments: string;
      decision: "effective" | "ineffective" | null;
      returnedAt: string;
      reviewerName: string | null;
    } | null = null;

    let approvalReturnNotice: {
      comments: string;
      decision: "effective" | "ineffective" | null;
      returnedAt: string;
      approverName: string | null;
    } | null = null;

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
      const reviewedByColCheck = await client.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'document_module_records' AND column_name = 'reviewed_by_user_name'`
      );
      const hasReviewedBy = reviewedByColCheck.rows.length > 0;
      const reviewedAtColCheck = await client.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'document_module_records' AND column_name = 'reviewed_at'`
      );
      const hasReviewedAt = reviewedAtColCheck.rows.length > 0;

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
        created_by_user_id: string | null;
        created_by_user_name: string | null;
        reviewed_by_user_name: string | null;
        reviewed_at: string | null;
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
          created_by_user_id,
          created_by_user_name,
          ${hasReviewedBy ? "reviewed_by_user_name" : "NULL::text AS reviewed_by_user_name"},
          ${hasReviewedAt ? "reviewed_at::text" : "NULL::text AS reviewed_at"},
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

      const singleId = requestedId?.trim() ?? "";
      if (singleId.length > 0 && rows.length > 0 && rows[0].workflow_status === "draft") {
        const historyTableCheck = await client.query(
          `SELECT 1 FROM information_schema.tables
           WHERE table_schema = 'public' AND table_name = 'document_module_history'`
        );
        if (historyTableCheck.rows.length > 0) {
          const historyRow = await client.query<{
            actor_user_name: string | null;
            details: { comments?: string; decision?: string | null };
            created_at: string;
          }>(
            `SELECT actor_user_name, details, created_at::text
             FROM document_module_history
             WHERE record_id = $1::uuid AND action = 'review_returned_for_correction'
             ORDER BY created_at DESC
             LIMIT 1`,
            [singleId]
          );
          const h = historyRow.rows[0];
          if (h) {
            const dec = h.details?.decision;
            const decision: "effective" | "ineffective" | null =
              dec === "ineffective" ? "ineffective" : dec === "effective" ? "effective" : null;
            reviewReturnNotice = {
              comments: String(h.details?.comments ?? ""),
              decision,
              returnedAt: h.created_at,
              reviewerName: h.actor_user_name ?? null,
            };
          }

          const approvalHistoryRow = await client.query<{
            actor_user_name: string | null;
            details: { comments?: string; decision?: string | null };
            created_at: string;
          }>(
            `SELECT actor_user_name, details, created_at::text
             FROM document_module_history
             WHERE record_id = $1::uuid AND action = 'approval_returned_for_correction'
             ORDER BY created_at DESC
             LIMIT 1`,
            [singleId]
          );
          const ah = approvalHistoryRow.rows[0];
          if (ah) {
            const decA = ah.details?.decision;
            const decisionA: "effective" | "ineffective" | null =
              decA === "ineffective" ? "ineffective" : decA === "effective" ? "effective" : null;
            approvalReturnNotice = {
              comments: String(ah.details?.comments ?? ""),
              decision: decisionA,
              returnedAt: ah.created_at,
              approverName: ah.actor_user_name ?? null,
            };
          }
        }
      }
    });

    return NextResponse.json({ records: rows, reviewReturnNotice, approvalReturnNotice }, { status: 200 });
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
    let postForbidden: NextResponse | null = null;

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
        const existingRow = await client.query<{
          form_data: unknown;
          created_by_user_id: string;
        }>(`SELECT form_data, created_by_user_id FROM document_module_records WHERE id::text = $1::text`, [
          sourceRecordId,
        ]);
        if (existingRow.rows.length === 0) {
          postForbidden = NextResponse.json({ error: "Document not found" }, { status: 404 });
          return;
        }
        const merged = normalizeDocumentFormData(
          { ...(existingRow.rows[0].form_data as object), ...formData },
          context.user,
          {}
        );
        const phase = String(merged.correctionPhase ?? "none");
        if (phase === "awaiting_creator_after_review") {
          const creatorId = String(merged.createdByUserId ?? existingRow.rows[0].created_by_user_id ?? "");
          if (context.user.id !== creatorId) {
            postForbidden = NextResponse.json(
              { error: "Only the document author may edit this draft while it is returned for correction." },
              { status: 403 }
            );
            return;
          }
        }
        if (phase === "awaiting_reviewer_after_approval") {
          if (
            !documentActorMatches(
              context.user.id,
              context.user.name,
              String(merged.processOwnerUserId ?? ""),
              String(merged.processOwner ?? "")
            )
          ) {
            postForbidden = NextResponse.json(
              { error: "Only the Process Owner may edit this draft while it is returned from approval." },
              { status: 403 }
            );
            return;
          }
        }
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
            JSON.stringify(merged),
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

      /** Resubmit an existing draft to review (same record id) — avoids duplicate INSERT rows. */
      if (status === "submitted" && sourceRecordId && saveMode === "create") {
        const existingRow = await client.query<{
          form_data: unknown;
          created_by_user_id: string;
        }>(`SELECT form_data, created_by_user_id FROM document_module_records WHERE id::text = $1::text`, [
          sourceRecordId,
        ]);
        if (existingRow.rows.length === 0) {
          postForbidden = NextResponse.json({ error: "Document not found" }, { status: 404 });
          return;
        }
        const existingForm = existingRow.rows[0].form_data as Record<string, unknown>;
        const phase = String(existingForm.correctionPhase ?? "none");
        const merged = normalizeDocumentFormData(
          { ...existingForm, ...formData },
          context.user,
          { clearCorrectionOnSubmit: true }
        );
        if (phase === "awaiting_creator_after_review") {
          const creatorId = String(merged.createdByUserId ?? existingRow.rows[0].created_by_user_id ?? "");
          if (context.user.id !== creatorId) {
            postForbidden = NextResponse.json(
              { error: "Only the document author may resubmit after a review return." },
              { status: 403 }
            );
            return;
          }
        }
        if (phase === "awaiting_reviewer_after_approval") {
          if (
            !documentActorMatches(
              context.user.id,
              context.user.name,
              String(merged.processOwnerUserId ?? ""),
              String(merged.processOwner ?? "")
            )
          ) {
            postForbidden = NextResponse.json(
              { error: "Only the Process Owner may resubmit after an approval return." },
              { status: 403 }
            );
            return;
          }
        }
        const updated = await client.query<{
          id: string;
          lifecycle_status: "active" | "obsolete";
          workflow_status: "draft" | "in_review" | "in_approval" | "approved";
        }>(
          `UPDATE document_module_records
           SET
             status = 'submitted',
             preview_doc_ref = $2,
             form_data = $3::jsonb,
             wizard_data = $4::jsonb,
             workflow_status = 'in_review',
             updated_by_user_id = $5,
             updated_by_user_name = $6,
             updated_at = NOW()
           WHERE id::text = $1::text
           RETURNING id::text, lifecycle_status, workflow_status`,
          [
            sourceRecordId,
            previewDocRef,
            JSON.stringify(merged),
            JSON.stringify(wizard),
            context.user.id,
            context.user.name,
          ]
        );
        savedRecordId = updated.rows[0]?.id ?? sourceRecordId;
        lifecycleStatus = updated.rows[0]?.lifecycle_status ?? "active";
        workflowStatus = (updated.rows[0]?.workflow_status as "in_review") ?? "in_review";
        if (savedRecordId) {
          await client.query(
            `INSERT INTO document_module_history (record_id, action, actor_user_id, actor_user_name, details)
             VALUES ($1::uuid, 'submitted_for_review', $2, $3, $4::jsonb)`,
            [
              savedRecordId,
              context.user.id,
              context.user.name,
              JSON.stringify({ saveMode: "resubmit" }),
            ]
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

      const normalizedInsert = normalizeDocumentFormData(formData, context.user, {
        clearCorrectionOnSubmit: status === "submitted",
      });

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
          JSON.stringify(normalizedInsert),
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

    if (postForbidden) return postForbidden;

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
    if (!["review-return", "review-submit", "approval-return", "approve"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    let workflowStatus: "draft" | "in_review" | "in_approval" | "approved" = "draft";

    let forbiddenResponse: NextResponse | null = null;

    await withTenantConnection(connectionString, async (client) => {
      const access = await client.query<{ form_data: unknown }>(
        `SELECT form_data FROM document_module_records WHERE id::text = $1::text`,
        [recordId]
      );
      if (access.rows.length === 0) {
        forbiddenResponse = NextResponse.json({ error: "Document not found" }, { status: 404 });
        return;
      }
      const formDataRow = access.rows[0].form_data as Record<string, unknown> | null;
      const actorName = context.user.name;
      const actorId = context.user.id;
      if (action === "review-return" || action === "review-submit") {
        const designatedOwnerId = String(formDataRow?.processOwnerUserId ?? "").trim();
        const designatedOwnerName = String(formDataRow?.processOwner ?? "");
        if (
          !documentActorMatches(actorId, actorName, designatedOwnerId, designatedOwnerName)
        ) {
          forbiddenResponse = NextResponse.json(
            {
              error:
                "Only the Process Owner / Responsible Person selected for this document may perform review actions.",
            },
            { status: 403 }
          );
          return;
        }
      }
      if (action === "approve" || action === "approval-return") {
        const designatedApproverId = String(formDataRow?.approverUserId ?? "").trim();
        const designatedApproverName = String(formDataRow?.approverName ?? "");
        if (
          !documentActorMatches(actorId, actorName, designatedApproverId, designatedApproverName)
        ) {
          forbiddenResponse = NextResponse.json(
            { error: "Only the designated Approver may perform this action." },
            { status: 403 }
          );
          return;
        }
      }

      if (action === "review-return") {
        const mergedForm = mergeFormDataCorrection(access.rows[0].form_data, "awaiting_creator_after_review");
        const updated = await client.query<{ workflow_status: "draft" }>(
          `UPDATE document_module_records
           SET workflow_status = 'draft',
               status = 'draft',
               form_data = $4::jsonb,
               reviewed_by_user_id = $2,
               reviewed_by_user_name = $3,
               reviewed_at = NOW(),
               updated_by_user_id = $2,
               updated_by_user_name = $3,
               updated_at = NOW()
           WHERE id::text = $1::text
           RETURNING workflow_status`,
          [recordId, context.user.id, context.user.name, JSON.stringify(mergedForm)]
        );
        workflowStatus = (updated.rows[0]?.workflow_status as "draft") ?? "draft";
        await client.query(
          `INSERT INTO document_module_history (record_id, action, actor_user_id, actor_user_name, details)
           VALUES ($1::uuid, 'review_returned_for_correction', $2, $3, $4::jsonb)`,
          [
            recordId,
            context.user.id,
            context.user.name,
            JSON.stringify({ comments: body.comments ?? "", decision: body.decision ?? null }),
          ]
        );
        return;
      }

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

      if (action === "approval-return") {
        const mergedForm = mergeFormDataCorrection(access.rows[0].form_data, "awaiting_reviewer_after_approval");
        const updated = await client.query<{ workflow_status: "draft" }>(
          `UPDATE document_module_records
           SET workflow_status = 'draft',
               status = 'draft',
               form_data = $4::jsonb,
               updated_by_user_id = $2,
               updated_by_user_name = $3,
               updated_at = NOW()
           WHERE id::text = $1::text
           RETURNING workflow_status`,
          [recordId, context.user.id, context.user.name, JSON.stringify(mergedForm)]
        );
        workflowStatus = (updated.rows[0]?.workflow_status as "draft") ?? "draft";
        await client.query(
          `INSERT INTO document_module_history (record_id, action, actor_user_id, actor_user_name, details)
           VALUES ($1::uuid, 'approval_returned_for_correction', $2, $3, $4::jsonb)`,
          [
            recordId,
            context.user.id,
            context.user.name,
            JSON.stringify({ comments: body.comments ?? "", decision: body.decision ?? null }),
          ]
        );
        return;
      }

      if (action === "approve") {
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
        return;
      }
    });

    if (forbiddenResponse) return forbiddenResponse;

    return NextResponse.json({ ok: true, workflowStatus }, { status: 200 });
  } catch (error) {
    console.error("Error updating document workflow:", error);
    return NextResponse.json({ error: "Failed to update workflow" }, { status: 500 });
  }
}

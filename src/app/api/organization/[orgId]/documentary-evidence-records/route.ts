import { NextRequest, NextResponse } from "next/server";
import { getRequestContextAndError } from "@/lib/request-context";
import { withTenantConnection } from "@/lib/db/connection-helper";
import { prisma } from "@/lib/prisma";
import { roleToLeadershipTier } from "@/lib/roles";
import {
  isSupportLeadershipTier,
  isTopOrOperationalLeadershipTier,
} from "@/lib/documentaryEvidenceAccess";

type CapturePayload = {
  templateRef?: string;
  shift?: string;
  lotBatchSerial?: string;
  capturedData?: string;
  additionalNotes?: string;
  designatedVerifierUserId?: string;
  designatedVerifierName?: string;
  supportUserId?: string;
  supportUserName?: string;
};

type VerifyArchivePayload = {
  verificationComments?: string;
  archiveLocation?: string;
  retentionPeriod?: string;
  capturedDataReview?: string;
};

function isFTypeRow(formData: unknown, wizardData: unknown): boolean {
  const w = typeof wizardData === "object" && wizardData !== null ? (wizardData as Record<string, unknown>) : {};
  const f = typeof formData === "object" && formData !== null ? (formData as Record<string, unknown>) : {};
  const t = String(w.documentClassification ?? f.docType ?? "")
    .trim()
    .toUpperCase();
  return t === "F";
}

async function resolveMembershipTier(orgId: string, userId: string): Promise<string | null> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { ownerId: true },
  });
  if (!org) return null;
  const membership = await prisma.userOrganization.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
    select: { role: true, leadershipTier: true },
  });
  const isOwner = org.ownerId === userId;
  return (
    (membership?.leadershipTier as string | null | undefined) ||
    (isOwner ? roleToLeadershipTier("owner") : roleToLeadershipTier(membership?.role ?? "member"))
  );
}

/** Support Leadership — draft/submit capture (POST). */
async function assertSupportUserCanCapture(orgId: string, userId: string): Promise<NextResponse | null> {
  const tier = await resolveMembershipTier(orgId, userId);
  if (tier === null) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }
  if (!isSupportLeadershipTier(tier)) {
    return NextResponse.json(
      { error: "Only Support Leadership can save documentary evidence capture records." },
      { status: 403 }
    );
  }
  return null;
}

/** Support or Top/Operational — read evidence rows (GET). */
async function assertCanReadDocumentaryEvidenceRecords(
  orgId: string,
  userId: string
): Promise<NextResponse | null> {
  const tier = await resolveMembershipTier(orgId, userId);
  if (tier === null) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }
  if (!isSupportLeadershipTier(tier) && !isTopOrOperationalLeadershipTier(tier)) {
    return NextResponse.json(
      { error: "You do not have access to documentary evidence records for this organization." },
      { status: 403 }
    );
  }
  return null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params;
    const { context, errorResponse } = await getRequestContextAndError(req, orgId);
    if (errorResponse) return errorResponse;

    const connectionString = context.tenant.connectionString;
    if (!connectionString) {
      return NextResponse.json({ error: "Tenant database not found" }, { status: 404 });
    }

    const requestedId = req.nextUrl.searchParams.get("id");
    const templateId = req.nextUrl.searchParams.get("templateRecordId");

    const forbidden = await assertCanReadDocumentaryEvidenceRecords(context.tenant.orgId, context.user.id);
    if (forbidden) return forbidden;

    let rows: Array<Record<string, unknown>> = [];
    await withTenantConnection(connectionString, async (client) => {
      await client.query(
        `CREATE TABLE IF NOT EXISTS documentary_evidence_records (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          template_record_id UUID NOT NULL REFERENCES document_module_records(id) ON DELETE CASCADE,
          template_preview_ref TEXT NOT NULL,
          workflow_status VARCHAR(32) NOT NULL DEFAULT 'draft',
          capture_data JSONB NOT NULL DEFAULT '{}'::jsonb,
          verify_archive_data JSONB NOT NULL DEFAULT '{}'::jsonb,
          designated_verifier_user_id TEXT NOT NULL DEFAULT '',
          designated_verifier_name TEXT NOT NULL DEFAULT '',
          support_user_id TEXT NOT NULL,
          support_user_name TEXT NULL,
          created_by_user_id TEXT NOT NULL,
          created_by_user_name TEXT NULL,
          updated_by_user_id TEXT NOT NULL,
          updated_by_user_name TEXT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`
      );

      if (requestedId?.trim()) {
        const r = await client.query(
          `SELECT id::text, template_record_id::text, template_preview_ref, workflow_status,
                  capture_data, verify_archive_data, designated_verifier_user_id, designated_verifier_name,
                  support_user_id, support_user_name, created_at::text, updated_at::text
           FROM documentary_evidence_records WHERE id::text = $1::text`,
          [requestedId.trim()]
        );
        rows = r.rows as Array<Record<string, unknown>>;
        return;
      }

      let sql = `SELECT id::text, template_record_id::text, template_preview_ref, workflow_status,
                        capture_data, verify_archive_data, designated_verifier_user_id, designated_verifier_name,
                        support_user_id, support_user_name, created_at::text, updated_at::text
                 FROM documentary_evidence_records`;
      const args: string[] = [];
      if (templateId?.trim()) {
        args.push(templateId.trim());
        sql += ` WHERE template_record_id::text = $1::text`;
      }
      sql += ` ORDER BY updated_at DESC`;
      const r = args.length > 0 ? await client.query(sql, args) : await client.query(sql);
      rows = r.rows as Array<Record<string, unknown>>;
    });

    return NextResponse.json({ records: rows }, { status: 200 });
  } catch (error) {
    console.error("documentary-evidence-records GET:", error);
    return NextResponse.json({ error: "Failed to load records" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params;
    const { context, errorResponse } = await getRequestContextAndError(req, orgId);
    if (errorResponse) return errorResponse;

    const connectionString = context.tenant.connectionString;
    if (!connectionString) {
      return NextResponse.json({ error: "Tenant database not found" }, { status: 404 });
    }

    const forbidden = await assertSupportUserCanCapture(context.tenant.orgId, context.user.id);
    if (forbidden) return forbidden;

    const body = (await req.json().catch(() => ({}))) as {
      action?: "draft" | "submit-capture";
      evidenceRecordId?: string;
      templateRecordId?: string;
      templatePreviewRef?: string;
      capturePayload?: CapturePayload;
    };

    const action = body.action === "submit-capture" ? "submit-capture" : "draft";
    const templateRecordId = String(body.templateRecordId ?? "").trim();
    const templatePreviewRef = String(body.templatePreviewRef ?? "").trim();
    const capturePayload = (body.capturePayload ?? {}) as CapturePayload;
    const evidenceRecordId = String(body.evidenceRecordId ?? "").trim();
    const wasUpdate = Boolean(evidenceRecordId);

    if (!templateRecordId) {
      return NextResponse.json({ error: "templateRecordId is required" }, { status: 400 });
    }

    const actorId = context.user.id;
    const actorName = context.user.name ?? "";

    let savedId = "";
    let workflowStatus = "draft";
    let captureJsonOut = "{}";

    await withTenantConnection(connectionString, async (client) => {
      await client.query(
        `CREATE TABLE IF NOT EXISTS documentary_evidence_records (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          template_record_id UUID NOT NULL REFERENCES document_module_records(id) ON DELETE CASCADE,
          template_preview_ref TEXT NOT NULL,
          workflow_status VARCHAR(32) NOT NULL DEFAULT 'draft',
          capture_data JSONB NOT NULL DEFAULT '{}'::jsonb,
          verify_archive_data JSONB NOT NULL DEFAULT '{}'::jsonb,
          designated_verifier_user_id TEXT NOT NULL DEFAULT '',
          designated_verifier_name TEXT NOT NULL DEFAULT '',
          support_user_id TEXT NOT NULL,
          support_user_name TEXT NULL,
          created_by_user_id TEXT NOT NULL,
          created_by_user_name TEXT NULL,
          updated_by_user_id TEXT NOT NULL,
          updated_by_user_name TEXT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`
      );

      const tpl = await client.query<{
        id: string;
        preview_doc_ref: string;
        form_data: unknown;
        wizard_data: unknown;
      }>(
        `SELECT id::text, preview_doc_ref, form_data, wizard_data
         FROM document_module_records WHERE id::text = $1::text`,
        [templateRecordId]
      );
      if (tpl.rows.length === 0) {
        throw new Error("TEMPLATE_NOT_FOUND");
      }
      const row = tpl.rows[0];
      if (!isFTypeRow(row.form_data, row.wizard_data)) {
        throw new Error("NOT_F_TYPE");
      }

      const captureJson = JSON.stringify({
        templateRef: capturePayload.templateRef ?? templatePreviewRef,
        shift: capturePayload.shift ?? "",
        lotBatchSerial: capturePayload.lotBatchSerial ?? "",
        capturedData: capturePayload.capturedData ?? "",
        additionalNotes: capturePayload.additionalNotes ?? "",
        savedAt: new Date().toISOString(),
      });
      captureJsonOut = captureJson;

      const verifierId = String(capturePayload.designatedVerifierUserId ?? "").trim();
      const verifierName = String(capturePayload.designatedVerifierName ?? "").trim();

      if (action === "submit-capture") {
        if (!verifierId || !verifierName) {
          throw new Error("VERIFIER_REQUIRED");
        }
      }

      workflowStatus = action === "submit-capture" ? "capture_submitted" : "draft";
      const ref = templatePreviewRef || row.preview_doc_ref || "";

      if (evidenceRecordId) {
        const own = await client.query(`SELECT id FROM documentary_evidence_records WHERE id::text = $1::text`,
          [evidenceRecordId]);
        if (own.rows.length === 0) {
          throw new Error("EVIDENCE_NOT_FOUND");
        }
        await client.query(
          `UPDATE documentary_evidence_records SET
              template_preview_ref = $2,
              workflow_status = $3,
              capture_data = $4::jsonb,
              designated_verifier_user_id = $5,
              designated_verifier_name = $6,
              support_user_id = $7,
              support_user_name = $8,
              updated_by_user_id = $9,
              updated_by_user_name = $10,
              updated_at = NOW()
           WHERE id::text = $1::text`,
          [
            evidenceRecordId,
            ref,
            workflowStatus,
            captureJson,
            verifierId,
            verifierName,
            actorId,
            actorName,
            actorId,
            actorName,
          ]
        );
        savedId = evidenceRecordId;
      } else {
        const ins = await client.query<{ id: string }>(
          `INSERT INTO documentary_evidence_records (
            template_record_id, template_preview_ref, workflow_status, capture_data,
            designated_verifier_user_id, designated_verifier_name,
            support_user_id, support_user_name,
            created_by_user_id, created_by_user_name, updated_by_user_id, updated_by_user_name
          ) VALUES (
            $1::uuid, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $9, $10
          ) RETURNING id::text`,
          [
            templateRecordId,
            ref,
            workflowStatus,
            captureJson,
            verifierId,
            verifierName,
            actorId,
            actorName,
            actorId,
            actorName,
          ]
        );
        savedId = ins.rows[0]?.id ?? "";
      }
    });

    const captureParsed = JSON.parse(captureJsonOut) as Record<string, unknown>;

    return NextResponse.json(
      {
        ok: true,
        id: savedId,
        workflowStatus,
        captureData: captureParsed,
      },
      { status: wasUpdate ? 200 : 201 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "TEMPLATE_NOT_FOUND") {
      return NextResponse.json({ error: "Template document not found" }, { status: 404 });
    }
    if (msg === "NOT_F_TYPE") {
      return NextResponse.json({ error: "Template must be an F-type (retained record) document." }, { status: 400 });
    }
    if (msg === "VERIFIER_REQUIRED") {
      return NextResponse.json({ error: "Designated verifier is required to submit capture." }, { status: 400 });
    }
    if (msg === "EVIDENCE_NOT_FOUND") {
      return NextResponse.json({ error: "Evidence record not found" }, { status: 404 });
    }
    console.error("documentary-evidence-records POST:", error);
    return NextResponse.json({ error: "Failed to save record" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params;
    const { context, errorResponse } = await getRequestContextAndError(req, orgId);
    if (errorResponse) return errorResponse;

    const connectionString = context.tenant.connectionString;
    if (!connectionString) {
      return NextResponse.json({ error: "Tenant database not found" }, { status: 404 });
    }

    const tier = await resolveMembershipTier(context.tenant.orgId, context.user.id);
    if (tier === null) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }
    if (!isTopOrOperationalLeadershipTier(tier)) {
      return NextResponse.json(
        { error: "Only the designated Top or Operational leadership verifier can complete verification." },
        { status: 403 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      evidenceRecordId?: string;
      verifyArchivePayload?: VerifyArchivePayload;
    };

    const evidenceRecordId = String(body.evidenceRecordId ?? "").trim();
    const va = (body.verifyArchivePayload ?? {}) as VerifyArchivePayload;

    if (!evidenceRecordId) {
      return NextResponse.json({ error: "evidenceRecordId is required" }, { status: 400 });
    }

    const comments = String(va.verificationComments ?? "").trim();
    if (!comments) {
      return NextResponse.json({ error: "Verification comments are required." }, { status: 400 });
    }

    const verifyJson = JSON.stringify({
      verificationComments: comments,
      archiveLocation: String(va.archiveLocation ?? "").trim(),
      retentionPeriod: String(va.retentionPeriod ?? "").trim(),
      capturedDataReview: String(va.capturedDataReview ?? "").trim(),
      completedAt: new Date().toISOString(),
    });

    const actorId = context.user.id;
    const actorName = context.user.name ?? "";

    await withTenantConnection(connectionString, async (client) => {
      const cur = await client.query<{
        designated_verifier_user_id: string;
        workflow_status: string;
      }>(
        `SELECT designated_verifier_user_id, workflow_status
         FROM documentary_evidence_records WHERE id::text = $1::text`,
        [evidenceRecordId]
      );
      if (cur.rows.length === 0) {
        throw new Error("NOT_FOUND");
      }
      const row = cur.rows[0];
      if (String(row.workflow_status ?? "").trim() !== "capture_submitted") {
        throw new Error("NOT_AWAITING_VERIFICATION");
      }
      if (String(row.designated_verifier_user_id ?? "").trim() !== actorId) {
        throw new Error("NOT_DESIGNATED_VERIFIER");
      }

      const r = await client.query(
        `UPDATE documentary_evidence_records SET
            workflow_status = 'completed',
            verify_archive_data = $2::jsonb,
            updated_by_user_id = $3,
            updated_by_user_name = $4,
            updated_at = NOW()
         WHERE id::text = $1::text
           AND workflow_status = 'capture_submitted'
           AND designated_verifier_user_id = $5
         RETURNING id::text`,
        [evidenceRecordId, verifyJson, actorId, actorName, actorId]
      );
      if (r.rows.length === 0) {
        throw new Error("NOT_FOUND");
      }
    });

    return NextResponse.json({ ok: true, workflowStatus: "completed" }, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ error: "Evidence record not found" }, { status: 404 });
    }
    if (msg === "NOT_AWAITING_VERIFICATION") {
      return NextResponse.json(
        { error: "This record is not awaiting verification." },
        { status: 400 }
      );
    }
    if (msg === "NOT_DESIGNATED_VERIFIER") {
      return NextResponse.json(
        { error: "Only the designated verifier can complete this step." },
        { status: 403 }
      );
    }
    console.error("documentary-evidence-records PATCH:", error);
    return NextResponse.json({ error: "Failed to complete record" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { uploadFileToS3 } from "@/lib/s3";
import {
  requireOrgMembership,
  validateUploadFile,
  sanitizeFileName,
} from "@/lib/file-access";

export const runtime = "nodejs";

/**
 * POST /api/files/audit-upload
 * Upload a file to S3 under audit-documents/{orgId}/{auditPlanId}/step-{step}/
 * FormData: file (required), orgId, auditPlanId, step, [fileType]
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const orgIdParam =
      (formData.get("orgId") as string) ||
      (req.nextUrl.searchParams.get("orgId") as string);
    const auditPlanId =
      (formData.get("auditPlanId") as string) ||
      (req.nextUrl.searchParams.get("auditPlanId") as string);
    const step =
      (formData.get("step") as string) ||
      (req.nextUrl.searchParams.get("step") as string);

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!orgIdParam) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    const access = await requireOrgMembership(req, orgIdParam);
    if (!access.ok) return access.response;
    const orgId = access.orgId!;

    const validationError = validateUploadFile(file);
    if (validationError) return validationError;

    const buffer = Buffer.from(await file.arrayBuffer());
    const sanitized = sanitizeFileName(file.name);
    const unique = `${randomUUID().slice(0, 8)}-${sanitized}`;

    const safeStep = String(step || "0").replace(/[^0-9a-zA-Z-_]/g, "");
    const safePlan = String(auditPlanId || "draft").replace(/[^0-9a-zA-Z-_]/g, "");
    const key = ["audit-documents", orgId, safePlan, `step-${safeStep}`, unique].join(
      "/"
    );

    const auditBucket =
      process.env.AWS_S3_BUCKET_AUDIT || process.env.AWS_S3_BUCKET_NAME;
    await uploadFileToS3(buffer, key, file.type, { useAuditBucket: true });

    const link = `/api/files/download?key=${encodeURIComponent(key)}`;
    return NextResponse.json({
      success: true,
      link,
      key,
      name: file.name,
      size: file.size,
      type: file.type,
      url: `s3://${auditBucket}/${key}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("[Audit Upload Error]:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

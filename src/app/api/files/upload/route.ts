import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { uploadFileToS3, generateFileKey } from "@/lib/s3";
import {
  requireOrgMembership,
  validateUploadFile,
  sanitizeFileName,
} from "@/lib/file-access";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const orgIdParam = formData.get("orgId") as string | null;
    const processId = formData.get("processId") as string | null;
    const issueId = formData.get("issueId") as string | null;
    const fileType = formData.get("fileType") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const validationError = validateUploadFile(file);
    if (validationError) return validationError;

    if (!orgIdParam) {
      return NextResponse.json(
        { error: "orgId is required" },
        { status: 400 }
      );
    }

    const access = await requireOrgMembership(req, orgIdParam);
    if (!access.ok) return access.response;
    const orgId = access.orgId!;

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop();
    if (!ext) {
      return NextResponse.json({ error: "File has no extension" }, { status: 400 });
    }

    let key: string;
    let responseData: Record<string, unknown>;

    if (processId && issueId && fileType) {
      if (!["containment", "rootCause", "actionPlan"].includes(fileType)) {
        return NextResponse.json({ error: "Invalid fileType" }, { status: 400 });
      }

      const timestamp = Date.now();
      const randomId = randomUUID().split("-")[0];
      const sanitizedFileName = sanitizeFileName(file.name);
      key = generateFileKey(
        orgId,
        processId,
        issueId,
        `${timestamp}-${randomId}-${sanitizedFileName}`,
        fileType as "containment" | "rootCause" | "actionPlan"
      );

      await uploadFileToS3(buffer, key, file.type);

      responseData = {
        success: true,
        file: {
          key,
          name: file.name,
          size: file.size,
          type: file.type,
          url: `s3://${process.env.AWS_S3_BUCKET_NAME}/${key}`,
        },
      };
    } else {
      // Editor / generic upload — org-scoped froala prefix
      key = `${orgId}/froala/${randomUUID()}.${ext}`;
      await uploadFileToS3(buffer, key, file.type);

      responseData = {
        link: `/api/files/froala/download?key=${encodeURIComponent(key)}`,
      };
    }

    return NextResponse.json(responseData);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("[File Upload Error]:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

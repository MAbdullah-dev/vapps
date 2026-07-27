import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { uploadFileToS3 } from "@/lib/s3";
import {
  requireOrgMembership,
  validateUploadFile,
} from "@/lib/file-access";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const orgIdParam =
      (formData.get("orgId") as string) ||
      (req.nextUrl.searchParams.get("orgId") as string);

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!orgIdParam) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    const access = await requireOrgMembership(req, orgIdParam);
    if (!access.ok) return access.response;
    const orgId = access.orgId!;

    const validationError = validateUploadFile(file, { imagesOnly: false });
    if (validationError) return validationError;

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "bin";
    const key = `${orgId}/froala/${randomUUID()}.${ext}`;

    await uploadFileToS3(buffer, key, file.type);

    return NextResponse.json({
      link: `/api/files/froala/download?key=${encodeURIComponent(key)}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("[Froala Upload Error]:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

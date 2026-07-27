import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { TIPTAP_S3_KEY_PREFIX, uploadTiptapFileToS3 } from "@/lib/s3";
import {
  requireOrgMembership,
  validateUploadFile,
} from "@/lib/file-access";

export const runtime = "nodejs";

/**
 * TipTap editor image uploads → org-scoped keys under tiptap/.
 * FormData: file (required), orgId (required).
 */
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

    const validationError = validateUploadFile(file, { imagesOnly: true });
    if (validationError) return validationError;

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop();
    if (!ext) {
      return NextResponse.json({ error: "File has no extension" }, { status: 400 });
    }

    // Keep tiptap/ prefix for bucket routing, embed org for authorization
    const key = `${TIPTAP_S3_KEY_PREFIX}${orgId}/${randomUUID()}.${ext}`;

    await uploadTiptapFileToS3(buffer, key, file.type);

    return NextResponse.json({
      link: `/api/files/froala/download?key=${encodeURIComponent(key)}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("[TipTap Upload Error]:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

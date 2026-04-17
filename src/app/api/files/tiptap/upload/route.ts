import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { TIPTAP_S3_KEY_PREFIX, uploadTiptapFileToS3 } from "@/lib/s3";

export const runtime = "nodejs";

/**
 * TipTap editor image uploads → bucket `AWS_S3_BUCKET_TIPTAP`, keys under `tiptap/`.
 * Example: `AWS_S3_BUCKET_TIPTAP=vapps-documents-prod` → object key `tiptap/uuid.png`
 * (full URI: `s3://vapps-documents-prod/tiptap/uuid.png`).
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop();
    if (!ext) {
      return NextResponse.json({ error: "File has no extension" }, { status: 400 });
    }

    const key = `${TIPTAP_S3_KEY_PREFIX}${uuid()}.${ext}`;

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

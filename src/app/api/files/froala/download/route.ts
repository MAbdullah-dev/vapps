import { NextRequest, NextResponse } from "next/server";
import { getPresignedDownloadUrl, extractS3Key, checkFileExists } from "@/lib/s3";
import { authorizeS3KeyAccess } from "@/lib/file-access";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const key = new URL(req.url).searchParams.get("key");
    if (!key) {
      return NextResponse.json({ error: "Missing key" }, { status: 400 });
    }

    const access = await authorizeS3KeyAccess(req, key);
    if (!access.ok) return access.response;

    const s3Key = extractS3Key(key);
    const fileInfo = await checkFileExists(s3Key);
    if (!fileInfo) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const signedUrl = await getPresignedDownloadUrl(s3Key, 60);
    return NextResponse.redirect(signedUrl);
  } catch {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
}

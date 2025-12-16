/**
 * Secure File Download API Route
 * 
 * Generates presigned URLs for private S3 files.
 * URLs expire after 1 hour for security.
 */

import { NextRequest, NextResponse } from "next/server";
import { getPresignedDownloadUrl, extractS3Key, checkFileExists } from "@/lib/s3";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { error: "Missing 'key' parameter" },
        { status: 400 }
      );
    }

    // Extract S3 key (handles both s3:// URLs and plain keys)
    const s3Key = extractS3Key(key);

    // Verify file exists
    const fileInfo = await checkFileExists(s3Key);
    if (!fileInfo) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    // Generate presigned URL (expires in 1 hour)
    const presignedUrl = await getPresignedDownloadUrl(s3Key, 3600);

    return NextResponse.json({
      success: true,
      url: presignedUrl,
      expiresIn: 3600, // seconds
      fileInfo: {
        size: fileInfo.size,
        contentType: fileInfo.contentType,
      },
    });
  } catch (error: any) {
    console.error("[File Download Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate download URL" },
      { status: 500 }
    );
  }
}

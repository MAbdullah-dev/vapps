/**
 * File Upload API Route
 * 
 * Handles secure file uploads to AWS S3 private bucket.
 * Files are uploaded with unique keys and metadata is returned.
 */

import { NextRequest, NextResponse } from "next/server";
import { uploadFileToS3, generateFileKey } from "@/lib/s3";

// Maximum file size: 10MB (adjust as needed)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Allowed MIME types (adjust based on your requirements)
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "text/plain",
  "text/csv",
];

export async function POST(req: NextRequest) {
  try {
    console.log("[File Upload] Request received");
    
    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const orgId = formData.get("orgId") as string;
    const processId = formData.get("processId") as string;
    const issueId = formData.get("issueId") as string;
    const fileType = formData.get("fileType") as "containment" | "rootCause" | "actionPlan";

    console.log("[File Upload] Parsed form data:", {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      orgId,
      processId,
      issueId,
      fileType,
    });

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!orgId || !processId || !issueId || !fileType) {
      return NextResponse.json(
        { error: "Missing required parameters: orgId, processId, issueId, fileType" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} is not allowed` },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique S3 key
    const key = generateFileKey(orgId, processId, issueId, file.name, fileType);

    // Upload to S3
    console.log("[File Upload] Uploading to S3 with key:", key);
    const uploadResult = await uploadFileToS3(buffer, key, file.type);
    console.log("[File Upload] Upload successful:", uploadResult.key);

    // Return file metadata (key will be used to generate presigned URLs later)
    return NextResponse.json({
      success: true,
      file: {
        key: uploadResult.key,
        name: file.name,
        size: file.size,
        type: file.type,
        // Don't return the s3:// URL to client, use key instead
        url: uploadResult.key, // Client will use this key to request presigned URL
      },
    });
  } catch (error: any) {
    console.error("[File Upload Error]:", error);
    console.error("[File Upload Error Stack]:", error.stack);
    return NextResponse.json(
      { error: error.message || "Failed to upload file" },
      { status: 500 }
    );
  }
}

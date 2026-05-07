import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-server-session";
import { prisma } from "@/lib/prisma";
import { uploadFileToS3 } from "@/lib/s3";
import { v4 as uuid } from "uuid";

export const runtime = "nodejs";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
/** Without S3, store base64 inline (dev / small installs). Keep bounded for DB/session size. */
const MAX_FALLBACK_STORE_BYTES = 200_000;

/**
 * POST /api/user/profile/avatar
 * Upload profile picture to AWS S3 (same bucket as other app uploads).
 * Body: multipart/form-data with "file" (image).
 * Stored at: s3://{AWS_S3_BUCKET_NAME}/avatars/{userId}/{uuid}.{ext}
 * Requires in .env: AWS_S3_BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 */
export async function POST(req: NextRequest) {
  try {
    const s3Configured =
      !!process.env.AWS_S3_BUCKET_NAME &&
      !!process.env.AWS_ACCESS_KEY_ID &&
      !!process.env.AWS_SECRET_ACCESS_KEY;

    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Use JPEG, PNG, GIF, or WebP." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5 MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (s3Configured) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const key = `avatars/${user.id}/${uuid()}.${ext}`;
      await uploadFileToS3(buffer, key, file.type);
      await prisma.user.update({
        where: { id: user.id },
        data: { image: key },
      });
      return NextResponse.json({ ok: true, image: key });
    }

    if (buffer.length > MAX_FALLBACK_STORE_BYTES) {
      return NextResponse.json(
        {
          error: `Picture too large without S3. Maximum stored size is ${Math.floor(MAX_FALLBACK_STORE_BYTES / 1024)} KB, or configure S3 for uploads up to 5 MB.`,
        },
        { status: 400 }
      );
    }

    const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;
    await prisma.user.update({
      where: { id: user.id },
      data: { image: dataUrl },
    });
    return NextResponse.json({ ok: true, image: dataUrl });
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}

/**
 * AWS S3 Utility Library
 * 
 * Provides secure file upload, download, and deletion functions for private S3 bucket.
 * All operations use IAM credentials from environment variables.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { FileType } from "@/types/file";

// Validate environment variables
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error("[S3] Missing AWS credentials. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in environment variables.");
}

if (!process.env.AWS_S3_BUCKET_NAME) {
  console.error("[S3] Missing AWS_S3_BUCKET_NAME. Please set this in environment variables.");
}

const defaultRegion = process.env.AWS_REGION || "eu-north-1";

const s3Credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
};

/** S3 is region-scoped; TipTap / audit buckets may live in a different region than {@link defaultRegion}. */
const s3ClientByRegion = new Map<string, S3Client>();

function getS3ClientForRegion(region: string): S3Client {
  const r = region || defaultRegion;
  let client = s3ClientByRegion.get(r);
  if (!client) {
    client = new S3Client({ region: r, credentials: s3Credentials });
    s3ClientByRegion.set(r, client);
  }
  return client;
}

function trimBucketName(value: string | undefined): string {
  if (!value) return "";
  return value.trim().replace(/\/+$/, "");
}

// Buckets – set env vars so the app knows which bucket is which:
//   AWS_S3_BUCKET_NAME    = default documents bucket (e.g. vapps-documents) → avatars, Froala, issue uploads
//   AWS_S3_BUCKET_AUDIT   = audit bucket (e.g. vapp-uploads-prod) → audit workflow uploads only
//   AWS_S3_BUCKET_TIPTAP  = TipTap bucket (e.g. vapps-documents-prod). Object keys: tiptap/<file>
//   AWS_S3_BUCKET_TIPTAP_REGION = region where that bucket lives (required if it differs from AWS_REGION)
// Same AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY are used for all; S3 clients are created per resolved region.
const BUCKET_DOCUMENTS = process.env.AWS_S3_BUCKET_NAME!;
const BUCKET_AUDIT = trimBucketName(process.env.AWS_S3_BUCKET_AUDIT) || BUCKET_DOCUMENTS; // fallback to documents if not set
/** TipTap uploads; defaults to documents bucket when unset (keys still use tiptap/ prefix). */
const BUCKET_TIPTAP = trimBucketName(process.env.AWS_S3_BUCKET_TIPTAP) || BUCKET_DOCUMENTS;
const UPLOAD_FOLDER = process.env.AWS_S3_UPLOAD_FOLDER || "issue-reviews";

/** Keys under this prefix are in the audit bucket; all other keys are in the documents bucket. */
const AUDIT_KEY_PREFIX = "audit-documents/";
/** Object key prefix inside the TipTap bucket (must end with /). Example: tiptap/a1b2c3d4.png */
export const TIPTAP_S3_KEY_PREFIX = "tiptap/";

function normalizeKeyForBucketLookup(key: string): string {
  return key.replace(/^\/+/, "");
}

/**
 * Resolves AWS region for an object key. Keys under `tiptap/` and `audit-documents/` can use
 * a different region than `AWS_REGION` (fixes "must be addressed using the specified endpoint").
 */
function getRegionForS3Key(key: string): string {
  const k = normalizeKeyForBucketLookup(key);
  if (k.startsWith(TIPTAP_S3_KEY_PREFIX)) {
    return trimBucketName(process.env.AWS_S3_BUCKET_TIPTAP_REGION) || defaultRegion;
  }
  if (k.startsWith(AUDIT_KEY_PREFIX)) {
    return trimBucketName(process.env.AWS_S3_BUCKET_AUDIT_REGION) || defaultRegion;
  }
  return defaultRegion;
}

function getS3ClientForKey(key: string): S3Client {
  return getS3ClientForRegion(getRegionForS3Key(key));
}

function getBucketForKey(key: string): string {
  const k = normalizeKeyForBucketLookup(key);
  if (k.startsWith(AUDIT_KEY_PREFIX)) return BUCKET_AUDIT;
  if (k.startsWith(TIPTAP_S3_KEY_PREFIX)) return BUCKET_TIPTAP;
  return BUCKET_DOCUMENTS;
}

/**
 * Generate a unique file key for S3 storage
 * Format: issue-reviews/{orgId}/{processId}/{issueId}/{timestamp}-{random}-{filename}
 */
export function generateFileKey(
  orgId: string,
  processId: string,
  issueId: string,
  fileName: string,
  fileType: FileType
) {
  return `${orgId}/${processId}/${issueId}/${fileType}/${fileName}`;
}

/**
 * Upload a file to S3
 * @param file - File buffer or stream
 * @param key - S3 object key (path)
 * @param contentType - MIME type of the file
 * @param options.useAuditBucket - If true, upload to audit bucket (vapp-uploads-prod). Otherwise use documents bucket (vapps-documents).
 * @returns S3 object key and URL metadata
 */
export async function uploadFileToS3(
  file: Buffer | Uint8Array,
  key: string,
  contentType: string,
  options?: { useAuditBucket?: boolean; bucket?: string }
): Promise<{ key: string; url: string; size: number }> {
  const bucket =
    options?.bucket ??
    (options?.useAuditBucket ? BUCKET_AUDIT : BUCKET_DOCUMENTS);
  if (!bucket) {
    throw new Error("AWS_S3_BUCKET_NAME (and optionally AWS_S3_BUCKET_AUDIT) must be set in environment variables.");
  }

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error("AWS credentials are not set. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your .env file.");
  }

  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file,
      ContentType: contentType,
      ServerSideEncryption: "AES256",
      Metadata: {
        uploadedAt: new Date().toISOString(),
      },
    });

    await getS3ClientForKey(key).send(command);

    return {
      key,
      url: `s3://${bucket}/${key}`,
      size: file.length,
    };
  } catch (error: any) {
    console.error("[S3 Upload Error]:", error);
    if (error.name === "InvalidAccessKeyId" || error.name === "SignatureDoesNotMatch") {
      throw new Error("Invalid AWS credentials. Please check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.");
    } else if (error.name === "NoSuchBucket") {
      throw new Error(
        `S3 bucket "${bucket}" does not exist. Check AWS_S3_BUCKET_NAME, AWS_S3_BUCKET_AUDIT, or AWS_S3_BUCKET_TIPTAP.`
      );
    } else if (error.name === "AccessDenied") {
      throw new Error(`Access denied to S3 bucket "${bucket}". Please check IAM permissions.`);
    } else if (error.$metadata?.httpStatusCode === 403) {
      throw new Error("Access forbidden. Please check your AWS IAM user has s3:PutObject permission.");
    }
    const msg = String(error.message || error.name || "");
    if (
      /endpoint|specified endpoint|PermanentRedirect|301/i.test(msg) ||
      error.name === "PermanentRedirect"
    ) {
      throw new Error(
        `S3 region mismatch for key "${key}". Set AWS_S3_BUCKET_TIPTAP_REGION (or AWS_S3_BUCKET_AUDIT_REGION) to the bucket's region, or set AWS_REGION to match ${bucket}. Original: ${msg}`
      );
    }
    throw new Error(`Failed to upload file to S3: ${error.message || error.name || "Unknown error"}`);
  }
}

/** TipTap rich-text image uploads → {@link BUCKET_TIPTAP}, keys under {@link TIPTAP_S3_KEY_PREFIX}. */
export async function uploadTiptapFileToS3(
  file: Buffer | Uint8Array,
  key: string,
  contentType: string
): Promise<{ key: string; url: string; size: number }> {
  if (!BUCKET_TIPTAP) {
    throw new Error("AWS_S3_BUCKET_TIPTAP or AWS_S3_BUCKET_NAME must be set for TipTap uploads.");
  }
  return uploadFileToS3(file, key, contentType, { bucket: BUCKET_TIPTAP });
}

/**
 * Generate a presigned URL for secure file download
 * @param key - S3 object key
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Presigned URL that expires after specified time
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string> {
  const bucket = getBucketForKey(key);
  if (!bucket) {
    throw new Error("AWS_S3_BUCKET_NAME environment variable is not set");
  }

  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const url = await getSignedUrl(getS3ClientForKey(key), command, { expiresIn });
    return url;
  } catch (error: any) {
    console.error("[S3 Presigned URL Error]:", error);
    throw new Error(`Failed to generate presigned URL: ${error.message}`);
  }
}

/**
 * Check if a file exists in S3
 * @param key - S3 object key
 * @returns File metadata if exists, null otherwise
 */
export async function checkFileExists(key: string): Promise<{ size: number; contentType: string; lastModified: Date } | null> {
  const bucket = getBucketForKey(key);
  if (!bucket) {
    throw new Error("AWS_S3_BUCKET_NAME environment variable is not set");
  }

  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await getS3ClientForKey(key).send(command);
    
    return {
      size: response.ContentLength || 0,
      contentType: response.ContentType || "application/octet-stream",
      lastModified: response.LastModified || new Date(),
    };
  } catch (error: any) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return null;
    }
    console.error("[S3 Check File Error]:", error);
    throw new Error(`Failed to check file existence: ${error.message}`);
  }
}

/**
 * Delete a file from S3
 * @param key - S3 object key
 */
export async function deleteFileFromS3(key: string): Promise<void> {
  const bucket = getBucketForKey(key);
  if (!bucket) {
    throw new Error("AWS_S3_BUCKET_NAME environment variable is not set");
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await getS3ClientForKey(key).send(command);
  } catch (error: any) {
    console.error("[S3 Delete Error]:", error);
    throw new Error(`Failed to delete file from S3: ${error.message}`);
  }
}

/**
 * Extract S3 key from URL or key string
 * Handles both s3:// URLs and plain keys
 */
export function extractS3Key(urlOrKey: string): string {
  if (urlOrKey.startsWith("s3://")) {
    // Extract key from s3://bucket/key format
    const parts = urlOrKey.replace("s3://", "").split("/");
    parts.shift(); // Remove bucket name
    return parts.join("/");
  }
  return urlOrKey;
}


/** Default-region client (same as documents / Froala paths). */
const s3Client = getS3ClientForRegion(defaultRegion);
export { s3Client as s3 };
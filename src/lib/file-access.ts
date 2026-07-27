/**
 * Authorize access to S3 object keys used by file upload/download routes.
 *
 * Key layouts:
 * - Issue reviews: `{orgId}/{processId}/{issueId}/{fileType}/{filename}`
 * - Audit docs: `audit-documents/{orgId}/...`
 * - Editor assets: `{orgId}/froala/...`, `{orgId}/tiptap/...`
 * - Legacy editor: `froala/...`, `tiptap/...` (no org prefix — auth-only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-server-session";
import { getTenantContext } from "@/lib/tenant-context";
import { getOrgBySlugOrId } from "@/lib/org-utils";
import { extractS3Key } from "@/lib/s3";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB
const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
]);
const ALLOWED_DOC_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
]);

export { MAX_UPLOAD_BYTES };

/**
 * Extract the organization id/slug embedded in an S3 key, if present.
 */
export function extractOrgIdFromS3Key(rawKey: string): string | null {
  const key = extractS3Key(rawKey).replace(/^\/+/, "");
  const parts = key.split("/").filter(Boolean);
  if (parts.length === 0) return null;

  if (parts[0] === "audit-documents" && parts[1]) {
    return parts[1];
  }

  // TipTap bucket layout: tiptap/{orgId}/...
  if (parts[0] === "tiptap" && parts[1] && parts[1] !== "unknown") {
    // Legacy: tiptap/{uuid}.ext (single segment after prefix) — no org
    if (parts.length === 2 && /\.[a-z0-9]+$/i.test(parts[1])) {
      return null;
    }
    return parts[1];
  }

  // New editor layout: {orgId}/froala/...
  if (parts.length >= 2 && parts[1] === "froala") {
    return parts[0];
  }

  // Legacy froala keys have no org — cannot tenant-scope
  if (parts[0] === "froala") {
    return null;
  }

  // Issue review / default: first segment is orgId
  if (parts[0] && parts[0] !== "unknown") {
    return parts[0];
  }

  return null;
}

export type FileAccessOk = {
  ok: true;
  user: { id: string; email: string | null; name: string | null };
  orgId: string | null;
};

export type FileAccessDenied = {
  ok: false;
  response: NextResponse;
};

/**
 * Require a logged-in user. If the key embeds an org id, require membership.
 * Legacy froala/tiptap keys without an org prefix only require authentication.
 */
export async function authorizeS3KeyAccess(
  req: NextRequest,
  rawKey: string
): Promise<FileAccessOk | FileAccessDenied> {
  const user = await getCurrentUser(req);
  if (!user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const s3Key = extractS3Key(rawKey).replace(/^\/+/, "");
  if (!s3Key || s3Key.includes("..")) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid key" }, { status: 400 }),
    };
  }

  const orgHint = extractOrgIdFromS3Key(s3Key);
  if (!orgHint) {
    // Legacy editor assets — authenticated users only (no tenant claim)
    return {
      ok: true,
      user: {
        id: user.id,
        email: user.email ?? null,
        name: user.name ?? null,
      },
      orgId: null,
    };
  }

  const tenant = await getTenantContext(orgHint, user.id);
  if (!tenant) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email ?? null,
      name: user.name ?? null,
    },
    orgId: tenant.orgId,
  };
}

/**
 * Require auth + membership for a client-supplied orgId (uploads).
 */
export async function requireOrgMembership(
  req: NextRequest,
  orgSlugOrId: string
): Promise<FileAccessOk | FileAccessDenied> {
  const user = await getCurrentUser(req);
  if (!user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const lookup = await getOrgBySlugOrId(orgSlugOrId);
  if (!lookup) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Organization not found" }, { status: 404 }),
    };
  }

  const tenant = await getTenantContext(lookup.id, user.id);
  if (!tenant) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email ?? null,
      name: user.name ?? null,
    },
    orgId: tenant.orgId,
  };
}

export function validateUploadFile(
  file: File,
  options?: { imagesOnly?: boolean }
): NextResponse | null {
  if (file.size <= 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB)` },
      { status: 413 }
    );
  }

  const mime = (file.type || "").toLowerCase();
  if (options?.imagesOnly) {
    if (!ALLOWED_IMAGE_MIME.has(mime)) {
      return NextResponse.json(
        { error: "Only image files are allowed" },
        { status: 400 }
      );
    }
    return null;
  }

  if (
    mime &&
    !ALLOWED_IMAGE_MIME.has(mime) &&
    !ALLOWED_DOC_MIME.has(mime) &&
    !mime.startsWith("image/")
  ) {
    return NextResponse.json(
      { error: "File type not allowed" },
      { status: 400 }
    );
  }

  return null;
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
}

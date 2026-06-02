export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/** Default route for editor image uploads (S3 keys under `tiptap/`). */
export const DEFAULT_EDITOR_IMAGE_UPLOAD_URL = "/api/files/tiptap/upload";

export type ImageUploadHandler = (
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal
) => Promise<string>;

/**
 * Builds an image upload handler POSTing `multipart/form-data` field `file` to the given URL.
 * Responses must include `link` or `url` with a path or absolute URL for `<img src>`.
 */
export function createHandleImageUpload(
  uploadUrl: string = DEFAULT_EDITOR_IMAGE_UPLOAD_URL
): ImageUploadHandler {
  return async (file, onProgress, abortSignal) => {
    if (!file) {
      throw new Error("No file provided");
    }
    if (!file.type.startsWith("image/")) {
      throw new Error("Only image files are allowed");
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(
        `File size exceeds maximum allowed (${MAX_FILE_SIZE / (1024 * 1024)}MB)`
      );
    }

    const formData = new FormData();
    formData.append("file", file);
    onProgress?.({ progress: 0 });

    const res = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
      credentials: "include",
      signal: abortSignal,
    });

    if (!res.ok) {
      let message = "Upload failed";
      try {
        const err = (await res.json()) as { error?: string };
        message = err.error ?? message;
      } catch {
        message = res.statusText || message;
      }
      throw new Error(message);
    }

    const data = (await res.json()) as { link?: string; url?: string };
    const href = data.link ?? data.url;
    if (!href || typeof href !== "string") {
      throw new Error("Invalid upload response");
    }

    onProgress?.({ progress: 100 });
    return href;
  };
}

export const handleImageUpload = createHandleImageUpload();

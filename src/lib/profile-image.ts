/**
 * Maps prisma/next-auth `user.image` to a URL the browser can load.
 * Uploaded avatars are stored as S3 object keys; use the app proxy route for those.
 * OAuth users typically have an https URL stored directly.
 */
export function resolveProfileImageSrc(
  image: string | null | undefined
): string | null {
  if (image == null || typeof image !== "string") return null;
  const t = image.trim();
  if (!t) return null;
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  if (t.startsWith("/api/user/avatar")) return t;
  return "/api/user/avatar";
}

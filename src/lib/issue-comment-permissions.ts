/** Client may send metadata alongside updates; ignore for PATCH shape checks. */
const IGNORED_PATCH_KEYS = new Set(["previousStatus"]);

/**
 * True when the body only updates `comments` (issuer / assignee thread).
 */
export function isIssueCommentsOnlyPatch(body: Record<string, unknown>): boolean {
  const keys = Object.keys(body).filter(
    (k) => body[k] !== undefined && !IGNORED_PATCH_KEYS.has(k)
  );
  return keys.length === 1 && keys[0] === "comments";
}

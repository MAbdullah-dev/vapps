/**
 * Coerce DB / JSON / pg shapes into a plain array for issue comments.
 */
export function coerceCommentsArray(raw: unknown): unknown[] {
  if (raw == null) return [];
  let r: unknown = raw;
  if (typeof r === "string") {
    try {
      r = JSON.parse(r) as unknown;
    } catch {
      return [];
    }
  }
  if (Array.isArray(r)) return r;
  if (typeof r === "object" && r !== null) {
    const o = r as Record<string, unknown>;
    const keys = Object.keys(o);
    if (keys.length > 0 && keys.every((k) => /^\d+$/.test(k))) {
      return keys.sort((a, b) => Number(a) - Number(b)).map((k) => o[k]);
    }
  }
  return [];
}

/**
 * Normalize `issue.comments` on an API issue row before JSON serialization.
 */
export function normalizeIssueCommentsOnRow(issue: Record<string, unknown>): void {
  issue.comments = coerceCommentsArray(issue.comments ?? issue.Comments);
}

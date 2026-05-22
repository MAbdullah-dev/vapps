/** Client may send metadata alongside updates; ignore for PATCH shape checks. */
const IGNORED_PATCH_KEYS = new Set(["previousStatus"]);

const STATUS_ONLY_KEYS = new Set(["status", "processId", "order", "siteId"]);

const ASSIGNEE_FORBIDDEN_KEYS = new Set(["assignee", "issuer", "verifier"]);

export type IssueWorkflowStatus = "to-do" | "in-progress" | "in-review" | "done";

export function isSameIssueUser(
  storedId: string | null | undefined,
  userId: string | null | undefined
): boolean {
  if (storedId == null || userId == null) return false;
  return String(storedId) === String(userId);
}

/**
 * True when the body only updates `comments` (issuer / assignee thread).
 */
export function isIssueCommentsOnlyPatch(body: Record<string, unknown>): boolean {
  const keys = Object.keys(body).filter(
    (k) => body[k] !== undefined && !IGNORED_PATCH_KEYS.has(k)
  );
  return keys.length === 1 && keys[0] === "comments";
}

/**
 * True when the body only updates board workflow fields (status move from Kanban).
 */
export function isIssueStatusOnlyPatch(body: Record<string, unknown>): boolean {
  const keys = Object.keys(body).filter(
    (k) => body[k] !== undefined && !IGNORED_PATCH_KEYS.has(k)
  );
  return keys.length > 0 && keys.every((k) => STATUS_ONLY_KEYS.has(k));
}

/**
 * Kanban / workflow status transitions shared by client board and API.
 * Returns an error message when the transition is not allowed, otherwise null.
 */
export function validateBoardIssueStatusTransition(
  oldStatus: string,
  newStatus: string,
  role: { isAssignee: boolean; isIssuer: boolean }
): string | null {
  if (oldStatus === newStatus) return null;

  if (newStatus === "done" && oldStatus !== "done") {
    return "Only the issuer can verify this issue from Manage Issues. Issues cannot be moved to Done from the board.";
  }

  if (
    oldStatus === "to-do" &&
    (newStatus === "in-progress" || newStatus === "in-review")
  ) {
    if (!role.isAssignee) {
      return "Only the assignee can move this issue from To Do.";
    }
    return null;
  }

  if (oldStatus === "in-progress" && newStatus === "in-review") {
    if (!role.isAssignee) {
      return "Only the assignee can move this issue to In Review.";
    }
    return null;
  }

  if (!role.isAssignee && !role.isIssuer) {
    return "Only the assignee or issue creator can update this issue.";
  }

  return null;
}

/** Assignee may edit issue details but not reassign ownership fields. */
export function issuePatchIncludesAssigneeForbiddenFields(
  body: Record<string, unknown>
): boolean {
  return Object.keys(body).some(
    (k) => body[k] !== undefined && ASSIGNEE_FORBIDDEN_KEYS.has(k)
  );
}

import type { Dispatch, MutableRefObject, SetStateAction } from "react";

/** Keeps Kanban issue list state and issuesRef in sync (required for drag queue + rollback). */
export function patchIssuesList<T>(
  setIssues: Dispatch<SetStateAction<T[]>>,
  issuesRef: MutableRefObject<T[]>,
  patch: (prev: T[]) => T[]
) {
  setIssues((prev) => {
    const next = patch(prev);
    issuesRef.current = next;
    return next;
  });
}

/** Open the shared create/edit issue dialog hosted by ProcessWorkspaceLayout. */
export function dispatchOpenIssueDialog(detail: {
  issueId: string;
  orgId: string;
  processId?: string;
}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("openIssueDialog", { detail }));
}

/**
 * dnd-kit MouseSensor starts a drag after ~5px of movement and then suppresses click.
 * Treat tiny "drags" that land on the same card as a click so the issue dialog still opens.
 */
export function isKanbanClickLikeDrag(event: {
  delta?: { x?: number; y?: number };
  active: { id: unknown };
  over?: { id: unknown } | null;
}): boolean {
  const distance = Math.hypot(event.delta?.x ?? 0, event.delta?.y ?? 0);
  if (distance >= 24) return false;
  return !event.over || String(event.over.id) === String(event.active.id);
}

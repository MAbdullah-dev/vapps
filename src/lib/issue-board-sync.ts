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

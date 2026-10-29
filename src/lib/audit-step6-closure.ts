import type { AuditNcFinding } from "@/lib/audit-step4-ca";

export type ClosureOutcome = "effective" | "ineffective";

export type Step6NcReview = {
  findingId: string;
  outcome: ClosureOutcome | null;
  managementComments: string;
  locked?: boolean;
};

export function emptyStep6Review(findingId: string): Step6NcReview {
  return {
    findingId,
    outcome: null,
    managementComments: "",
    locked: false,
  };
}

function reviewFromRecord(raw: Record<string, unknown>, findingId: string): Step6NcReview {
  const outcome =
    raw.outcome === "effective" || raw.outcome === "ineffective"
      ? raw.outcome
      : raw.finalDecision === "effective" || raw.finalDecision === "ineffective"
        ? raw.finalDecision
        : null;
  return {
    findingId: typeof raw.findingId === "string" && raw.findingId ? raw.findingId : findingId,
    outcome,
    managementComments:
      typeof raw.managementComments === "string"
        ? raw.managementComments
        : typeof raw.comments === "string"
          ? raw.comments
          : "",
    locked: raw.locked === true,
  };
}

export function parseStep6Reviews(
  step6Data: unknown,
  ncs: AuditNcFinding[]
): Record<string, Step6NcReview> {
  const map: Record<string, Step6NcReview> = {};
  for (const nc of ncs) map[nc.id] = emptyStep6Review(nc.id);
  if (!step6Data || typeof step6Data !== "object") return map;
  const d = step6Data as Record<string, unknown>;
  if (Array.isArray(d.reviews)) {
    for (const item of d.reviews) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const id = typeof rec.findingId === "string" ? rec.findingId : "";
      if (!id || !map[id]) continue;
      map[id] = reviewFromRecord(rec, id);
    }
    return map;
  }
  const legacy =
    d.finalDecision === "effective" || d.finalDecision === "ineffective" ? d.finalDecision : null;
  if (legacy && ncs[0]) {
    map[ncs[0].id] = {
      findingId: ncs[0].id,
      outcome: legacy,
      managementComments: typeof d.managementComments === "string" ? d.managementComments : "",
      locked: false,
    };
  }
  return map;
}

export function isStep6ReviewComplete(r: Step6NcReview): boolean {
  return (r.outcome === "effective" || r.outcome === "ineffective") && r.managementComments.trim() !== "";
}

export function allNcsClosureReviewed(
  ncs: AuditNcFinding[],
  map: Record<string, Step6NcReview>
): boolean {
  return ncs.length > 0 && ncs.every((nc) => isStep6ReviewComplete(map[nc.id] ?? emptyStep6Review(nc.id)));
}

export function allNcsClosureEffective(
  ncs: AuditNcFinding[],
  map: Record<string, Step6NcReview>
): boolean {
  return ncs.length > 0 && ncs.every((nc) => (map[nc.id] ?? emptyStep6Review(nc.id)).outcome === "effective");
}

export function ineffectiveClosureFindingIds(
  ncs: AuditNcFinding[],
  map: Record<string, Step6NcReview>
): string[] {
  return ncs
    .filter((nc) => (map[nc.id] ?? emptyStep6Review(nc.id)).outcome === "ineffective")
    .map((nc) => nc.id);
}

export function resetIneffectiveClosureReviews(
  ncs: AuditNcFinding[],
  map: Record<string, Step6NcReview>
): Step6NcReview[] {
  return ncs.map((nc) => {
    const current = map[nc.id] ?? emptyStep6Review(nc.id);
    if (current.outcome === "ineffective") return emptyStep6Review(nc.id);
    if (current.outcome === "effective") return { ...current, locked: true };
    return current;
  });
}

export function buildStep6Payload(
  ncs: AuditNcFinding[],
  map: Record<string, Step6NcReview>,
  extras: { dateApproved: string; timeApproved: string }
): Record<string, unknown> {
  const reviews = ncs.map((nc) => map[nc.id] ?? emptyStep6Review(nc.id));
  const anyIneffective = reviews.some((r) => r.outcome === "ineffective");
  const stored = reviews.map((r) =>
    anyIneffective && r.outcome === "effective" ? { ...r, locked: true } : r
  );
  const primary = stored[0];
  return {
    version: 2,
    reviews: stored,
    finalDecision: anyIneffective ? "ineffective" : "effective",
    managementComments: primary?.managementComments ?? "",
    dateApproved: extras.dateApproved,
    timeApproved: extras.timeApproved,
  };
}

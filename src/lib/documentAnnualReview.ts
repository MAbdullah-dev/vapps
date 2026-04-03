/** True when reviewed_at + 1 calendar year has passed (annual review cycle due). */
export function isAnnualReviewOverdue(reviewedAtRaw: string | null | undefined): boolean {
  const t = String(reviewedAtRaw ?? "").trim();
  if (!t) return false;
  const reviewedAt = new Date(t);
  if (Number.isNaN(reviewedAt.getTime())) return false;
  const due = new Date(reviewedAt);
  due.setFullYear(due.getFullYear() + 1);
  return Date.now() >= due.getTime();
}

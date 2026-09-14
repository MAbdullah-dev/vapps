import type { BillingCycle } from "@prisma/client";

export function addCalendarMonths(from: Date, months: number): Date {
  const next = new Date(from);
  const day = next.getUTCDate();
  next.setUTCMonth(next.getUTCMonth() + months);
  // 31 Jan + 1 month can overflow into March; pin to last day of the target month.
  if (next.getUTCDate() < day) {
    next.setUTCDate(0);
  }
  return next;
}

export function addCalendarDays(from: Date, days: number): Date {
  const next = new Date(from);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function periodEndFor(cycle: BillingCycle, start: Date): Date {
  if (cycle === "ANNUAL") return addCalendarMonths(start, 12);
  // ONE_TIME still needs a window for usage counters; treat it as a year.
  if (cycle === "ONE_TIME") return addCalendarMonths(start, 12);
  return addCalendarMonths(start, 1);
}

export function currentPeriodWindow(
  cycle: BillingCycle,
  now = new Date()
): { start: Date; end: Date } {
  const start = now;
  return { start, end: periodEndFor(cycle, start) };
}

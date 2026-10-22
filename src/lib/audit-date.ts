import { format, startOfDay } from "date-fns";

/** Local midnight for the current day. Calendar fields may select this day and later days. */
export function startOfToday(): Date {
  return startOfDay(new Date());
}

export function isBeforeToday(date: Date | undefined | null): boolean {
  if (!date) return false;
  return startOfDay(date) < startOfToday();
}

/** date-fns `format()` rejects `Date | undefined`; use this in JSX conditionals. */
export function formatOptionalDate(
  date: Date | undefined | null,
  pattern: string
): string | undefined {
  if (date == null) return undefined;
  return format(date, pattern);
}

/** Earliest selectable end date: today, or the start date when it is after today. */
export function minSelectableEndDate(startPeriod: Date | undefined | null): Date {
  if (startPeriod == null) return startOfToday();
  const start = startOfDay(startPeriod);
  return start > startOfToday() ? start : startOfToday();
}

export function isEndBeforeStart(
  startPeriod: Date | undefined | null,
  endPeriod: Date | undefined | null
): boolean {
  if (startPeriod == null || endPeriod == null) return false;
  return startOfDay(endPeriod) < startOfDay(startPeriod);
}

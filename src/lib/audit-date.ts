import { startOfDay } from "date-fns";

/** Local midnight for the current day. Calendar fields may select this day and later days. */
export function startOfToday(): Date {
  return startOfDay(new Date());
}

export function isBeforeToday(date: Date | undefined | null): boolean {
  if (!date) return false;
  return startOfDay(date) < startOfToday();
}

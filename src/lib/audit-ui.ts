import { cn } from "@/lib/utils";

/** Shared Audit module section title (ISO 19011 / 34v12 heading weight). */
export const auditSectionHeadingClass =
  "text-xl font-bold tracking-tight text-foreground";

export const auditFieldLabelClass =
  "text-xs font-semibold uppercase tracking-wide text-muted-foreground";

export const auditSelectTriggerClass =
  "h-11 w-full rounded-lg border-border bg-background px-3 text-sm shadow-xs";

export const auditSelectContentClass =
  "rounded-lg border-border p-1 shadow-lg";

export function auditSelectTrigger(hasError?: boolean): string {
  return cn(
    auditSelectTriggerClass,
    hasError && "border-destructive focus-visible:ring-destructive"
  );
}

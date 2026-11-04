"use client";

import { AlertTriangle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslate } from "@/components/providers/translation-provider";
import { AUDIT_STATUS_LABELS, getAuditStatusColor } from "@/lib/compliance-kpi";
import {
  ncLifecycleLabel,
  type NcMatrixRow,
} from "@/lib/audit-nc-matrix";
import { cn } from "@/lib/utils";

export function AuditNonconformityMatrix({
  rows,
  showLifecycle = false,
  showRules = true,
  highlightFindingId,
}: {
  rows: NcMatrixRow[];
  showLifecycle?: boolean;
  showRules?: boolean;
  highlightFindingId?: string | null;
}) {
  const { t } = useTranslate();
  const colSpan = showLifecycle ? 10 : 9;

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-foreground">
        {t("Nonconformity Matrix")}
      </h2>
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-muted">
              <TableHead className="text-xs font-semibold uppercase text-foreground">
                {t("Nonconformity Reference")}
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase text-foreground">{t("Standard")}</TableHead>
              <TableHead className="text-xs font-semibold uppercase text-foreground">{t("Site")}</TableHead>
              <TableHead className="text-xs font-semibold uppercase text-foreground">{t("Process / Area")}</TableHead>
              <TableHead className="text-xs font-semibold uppercase text-foreground">{t("Clause")}</TableHead>
              <TableHead className="text-xs font-semibold uppercase text-foreground">{t("Subclauses")}</TableHead>
              <TableHead className="text-xs font-semibold uppercase text-foreground">
                {t("Classification")}
                <span className="ml-1 font-normal">
                  <span className="font-bold text-red-600">{t("MA")}</span>
                  {" / "}
                  <span className="font-bold text-emerald-600">{t("mi")}</span>
                </span>
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase text-foreground">
                {t("Due Date")}
                <span className="ml-1 block font-normal normal-case text-[10px] text-muted-foreground">
                  {t("Major 30 days")} · {t("Minor 60 days")}
                </span>
              </TableHead>
              {showLifecycle && (
                <TableHead className="text-xs font-semibold uppercase text-foreground">
                  {t("Lifecycle")}
                </TableHead>
              )}
              <TableHead className="text-xs font-semibold uppercase text-foreground">
                {t("NC Status")}
                <span className="ml-1 block font-normal normal-case text-[10px] leading-4 text-muted-foreground">
                  <span className="text-primary">{t(AUDIT_STATUS_LABELS.success)}</span>
                  {" · "}
                  <span className="text-amber-600">{t(AUDIT_STATUS_LABELS.inProgress)}</span>
                  {" · "}
                  <span className="text-amber-700">{t(AUDIT_STATUS_LABELS.inProgressTracking)}</span>
                  {" · "}
                  {t(AUDIT_STATUS_LABELS.pending)}
                  {" · "}
                  <span className="text-red-600">{t(AUDIT_STATUS_LABELS.fail)}</span>
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="border-border bg-background">
                <TableCell colSpan={colSpan} className="py-6 text-center text-sm text-muted-foreground">
                  {t("No major or minor nonconformities recorded yet.")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    "border-border bg-background",
                    highlightFindingId === row.id && "bg-primary/5"
                  )}
                >
                  <TableCell className="whitespace-nowrap font-mono text-xs text-foreground">
                    {row.reference}
                  </TableCell>
                  <TableCell className="text-sm text-foreground">{row.standard}</TableCell>
                  <TableCell className="text-sm font-bold text-foreground">{row.site}</TableCell>
                  <TableCell className="text-sm text-foreground">{row.processArea}</TableCell>
                  <TableCell className="text-sm font-bold text-foreground">{row.clause}</TableCell>
                  <TableCell className="text-sm text-foreground">{row.subclauses}</TableCell>
                  <TableCell
                    className={cn(
                      "whitespace-nowrap text-sm font-bold",
                      row.classification === "MA" ? "text-red-600" : "text-emerald-600"
                    )}
                  >
                    {t(row.classificationLabel)}{" "}
                    <span className="uppercase">{row.classification}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-foreground">{row.dueDate}</TableCell>
                  {showLifecycle && (
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex rounded px-2 py-0.5 text-xs font-semibold",
                          row.lifecycle === "closed" && "bg-primary/15 text-primary",
                          row.lifecycle === "verified" && "bg-emerald-100 text-emerald-800",
                          row.lifecycle === "returned" && "bg-red-100 text-red-700",
                          row.lifecycle === "ca_submitted" && "bg-amber-100 text-amber-800",
                          row.lifecycle === "open" && "bg-muted text-muted-foreground"
                        )}
                      >
                        {t(ncLifecycleLabel(row.lifecycle))}
                      </span>
                    </TableCell>
                  )}
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex rounded px-2 py-0.5 text-xs font-semibold",
                        getAuditStatusColor(row.ncStatus) || "text-foreground"
                      )}
                    >
                      {t(row.ncStatus)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {showRules && (
        <div className="mt-4 flex gap-3 rounded-lg border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900 dark:bg-amber-950/40">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
          <div className="min-w-0 space-y-1 text-sm">
            <p className="font-bold text-foreground">
              {t("SYSTEM AUTOMATION RULE (MATRIX LOGIC)")}
            </p>
            <p className="text-muted-foreground">
              {t("Nonconformity references follow AUD/Year/Site/Process/AuditType/A#/NC#")}
              {", "}
              {t("e.g.")}{" "}
              <span className="font-mono text-primary">AUD/2026/S1/ITMS/FPA/A1/NC1</span>
            </p>
            <p className="text-muted-foreground">
              {t(
                "All Major (MA) nonconformities trigger a mandatory follow-up audit within 30 days, while Minor (mi) NCs require CA submission within 60 days."
              )}
            </p>
            <p className="text-muted-foreground">
              {t("Audit KPI tracking starts after 30 days, with a target due date of 60 days. The KPI score is zero after 70 days.")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

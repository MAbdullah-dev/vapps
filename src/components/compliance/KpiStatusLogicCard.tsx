"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useTranslate } from "@/components/providers/translation-provider";

export function KpiStatusLogicCard({
  className,
  variant = "compliance",
}: {
  className?: string;
  variant?: "compliance" | "audit";
}) {
  const { t } = useTranslate();
  const isAudit = variant === "audit";
  return (
    <Card className={className}>
      <CardContent className="space-y-3 py-4">
        <h2 className="text-base font-semibold text-foreground">{t("KPI Status Logic")}</h2>
        <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted-foreground">
          {isAudit ? (
            <>
              <div className="flex items-center gap-2">
                <span className="size-3 shrink-0 rounded-sm bg-emerald-500" aria-hidden />
                <span>{t("Success ≤60 days → Green Consistent")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-3 shrink-0 rounded-sm bg-amber-400" aria-hidden />
                <span>{t("In-Progress <30 days → Yellow, tracking starts at 30 days")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-3 shrink-0 rounded-sm bg-amber-500" aria-hidden />
                <span>{t("In-Progress +30 days → Yellow, due at 60 days")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-3 shrink-0 rounded-sm bg-red-500" aria-hidden />
                <span>{t("Pending >60 days → Red")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-3 shrink-0 rounded-full bg-red-600" aria-hidden />
                <span>{t("Fail >70 days → KPI score zero, Inconsistent")}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="size-3 shrink-0 rounded-sm bg-emerald-500" aria-hidden />
                <span>{t("Success ≤30 days → Green Consistent")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-3 shrink-0 rounded-sm bg-amber-400" aria-hidden />
                <span>{t("In-Progress <30 days → Yellow")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-3 shrink-0 rounded-sm bg-red-500" aria-hidden />
                <span>{t("Pending >30 days → Red")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-3 shrink-0 rounded-full bg-red-600" aria-hidden />
                <span>{t("Fail >40 days → Red Inconsistent")}</span>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

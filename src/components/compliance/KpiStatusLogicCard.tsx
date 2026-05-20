"use client";

import { Card, CardContent } from "@/components/ui/card";

export function KpiStatusLogicCard({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardContent className="space-y-3 py-4">
        <h2 className="text-base font-semibold text-foreground">KPI Status Logic</h2>
        <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="size-3 shrink-0 rounded-sm bg-emerald-500" aria-hidden />
            <span>Success ≤30 days → Green (Consistent)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-3 shrink-0 rounded-sm bg-amber-400" aria-hidden />
            <span>In-Progress &lt;30 days → Yellow</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-3 shrink-0 rounded-sm bg-red-500" aria-hidden />
            <span>Pending &gt;30 days → Red</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-3 shrink-0 rounded-full bg-red-600" aria-hidden />
            <span>Fail &gt;40 days → Red (Inconsistent)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

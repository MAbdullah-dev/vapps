"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { OrgKpiMetric } from "@/lib/org-kpi-metrics";
import {
  DASHBOARD_WIDGET_GROUPS,
  isWidgetGroupSelected,
  toggleWidgetGroup,
  type DashboardWidgetsConfig,
} from "@/lib/dashboard-widgets";

const TargetIcon = () => (
  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-6 w-6"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  </div>
);

export default function KPIReportsPage() {
  const params = useParams();
  const orgId = params?.orgId as string;

  const [kpis, setKpis] = useState<OrgKpiMetric[]>([]);
  const [kpiComputedAt, setKpiComputedAt] = useState<string | null>(null);
  const [kpisLoading, setKpisLoading] = useState(true);

  const [widgets, setWidgets] = useState<DashboardWidgetsConfig | null>(null);
  const [widgetsUpdatedAt, setWidgetsUpdatedAt] = useState<string | null>(null);
  const [widgetsLoading, setWidgetsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadKpis = useCallback(async () => {
    if (!orgId) return;
    try {
      setKpisLoading(true);
      const res = await apiClient.getOrgKpiMetrics(orgId);
      setKpis(res.kpis);
      setKpiComputedAt(res.computedAt);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load KPI metrics");
      setKpis([]);
    } finally {
      setKpisLoading(false);
    }
  }, [orgId]);

  const loadWidgets = useCallback(async () => {
    if (!orgId) return;
    try {
      setWidgetsLoading(true);
      const res = await apiClient.getDashboardWidgets(orgId);
      setWidgets(res.widgets);
      setWidgetsUpdatedAt(res.updatedAt);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load dashboard widget settings");
    } finally {
      setWidgetsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadKpis();
    loadWidgets();
  }, [loadKpis, loadWidgets]);

  const persistWidgets = async (next: DashboardWidgetsConfig) => {
    if (!orgId) return;
    setSaving(true);
    try {
      const res = await apiClient.updateDashboardWidgets(orgId, next);
      setWidgets(res.widgets);
      setWidgetsUpdatedAt(res.updatedAt);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("dashboardWidgetsUpdated", { detail: { orgId } })
        );
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to save widget settings");
      await loadWidgets();
    } finally {
      setSaving(false);
    }
  };

  const handleWidgetToggle = (groupId: string) => {
    if (!widgets) return;
    const group = DASHBOARD_WIDGET_GROUPS.find((g) => g.id === groupId);
    if (!group) return;
    const currentlySelected = isWidgetGroupSelected(widgets, group.keys);
    const next = toggleWidgetGroup(widgets, group.keys, !currentlySelected);
    setWidgets(next);
    void persistWidgets(next);
  };

  const formatUpdatedAt = (iso: string | null) => {
    if (!iso) return "Not saved yet";
    try {
      return new Date(iso).toLocaleString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground mb-1">Settings &gt; KPI & Reports</div>
          <h1 className="text-2xl font-semibold text-foreground">KPI & Reports Configuration</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live KPIs from your issues, audits, and documents. Choose dashboard widgets below and
            changes apply immediately for all members.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {kpiComputedAt ? (
            <div className="text-sm text-muted-foreground text-right">
              KPIs calculated: {formatUpdatedAt(kpiComputedAt)}
            </div>
          ) : null}
          {widgetsUpdatedAt ? (
            <div className="text-xs text-muted-foreground text-right">
              Widgets saved: {formatUpdatedAt(widgetsUpdatedAt)}
            </div>
          ) : null}
          {saving ? <span className="text-xs text-muted-foreground">Saving widgets…</span> : null}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Key Performance Indicators</CardTitle>
            <CardDescription>
              Calculated from organization data using the same compliance thresholds (30 / 40 day rules).
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={kpisLoading}
            onClick={() => loadKpis()}
          >
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {kpisLoading ? (
            <p className="text-sm text-muted-foreground py-4">Calculating KPI metrics…</p>
          ) : kpis.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No KPI data available yet. Add issues, audits, or documents to see metrics.
            </p>
          ) : (
            kpis.map((kpi) => (
              <div
                key={kpi.id}
                className="flex items-center gap-4 rounded-lg border border-border bg-muted/50 p-4"
              >
                <TargetIcon />
                <div className="flex-1 min-w-0">
                  <div className="mb-1 font-semibold text-foreground">{kpi.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Target: {kpi.target} • Current: {kpi.current}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0",
                    kpi.status === "on-track"
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-destructive/30 bg-destructive/10 text-destructive"
                  )}
                >
                  {kpi.status === "on-track" ? "On Track" : "At Risk"}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dashboard Widgets</CardTitle>
          <CardDescription>
            Selected widgets are shown on the main dashboard. Deselect to hide a section.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {widgetsLoading ? (
            <p className="text-sm text-muted-foreground py-4">Loading widget preferences…</p>
          ) : !widgets ? (
            <p className="text-sm text-muted-foreground py-4">Unable to load preferences.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DASHBOARD_WIDGET_GROUPS.map((group) => {
                const selected = isWidgetGroupSelected(widgets, group.keys);
                return (
                  <Button
                    key={group.id}
                    type="button"
                    variant={selected ? "default" : "outline"}
                    disabled={saving}
                    aria-pressed={selected}
                    onClick={() => handleWidgetToggle(group.id)}
                    className="h-auto min-h-13 w-full justify-start gap-3 p-4 text-left font-medium"
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-sm border",
                        selected
                          ? "border-primary-foreground/40 bg-primary-foreground/15"
                          : "border-border bg-muted"
                      )}
                      aria-hidden
                    >
                      {selected ? <Check className="size-3.5" strokeWidth={3} /> : null}
                    </span>
                    <span>{group.name}</span>
                  </Button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

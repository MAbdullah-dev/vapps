/** Keys match `dashboard_widgets` tenant table columns. */
export type DashboardWidgetKey =
  | "tasksCompleted"
  | "complianceScore"
  | "workloadByUser"
  | "overdueTasks"
  | "issueDistribution"
  | "auditTrend"
  | "projectProgress"
  | "documentVersion"
  | "recentActivity";

export type DashboardWidgetsConfig = Record<DashboardWidgetKey, boolean>;

export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidgetsConfig = {
  tasksCompleted: true,
  complianceScore: true,
  workloadByUser: false,
  overdueTasks: true,
  issueDistribution: true,
  auditTrend: true,
  projectProgress: true,
  documentVersion: false,
  recentActivity: true,
};

/** Settings UI groups (one toggle may control multiple DB keys). */
export const DASHBOARD_WIDGET_GROUPS: {
  id: string;
  name: string;
  keys: DashboardWidgetKey[];
}[] = [
  {
    id: "issue-status",
    name: "Issue Status Overview",
    keys: ["overdueTasks", "issueDistribution"],
  },
  {
    id: "audit-progress",
    name: "Audit Progress",
    keys: ["auditTrend"],
  },
  {
    id: "team-performance",
    name: "Team Performance",
    keys: ["workloadByUser"],
  },
  {
    id: "document-status",
    name: "Document Status",
    keys: ["documentVersion"],
  },
  {
    id: "compliance-score",
    name: "Compliance Score",
    keys: ["complianceScore"],
  },
  {
    id: "recent-activity",
    name: "Recent Activity",
    keys: ["recentActivity"],
  },
  {
    id: "active-projects",
    name: "Active Projects",
    keys: ["projectProgress"],
  },
  {
    id: "issues-trend",
    name: "Issues Created vs Completed",
    keys: ["tasksCompleted"],
  },
];

export function normalizeDashboardWidgets(
  row: Partial<DashboardWidgetsConfig> | null | undefined
): DashboardWidgetsConfig {
  return { ...DEFAULT_DASHBOARD_WIDGETS, ...row };
}

export function isWidgetGroupSelected(
  widgets: DashboardWidgetsConfig,
  keys: DashboardWidgetKey[]
): boolean {
  return keys.every((key) => widgets[key]);
}

export function toggleWidgetGroup(
  widgets: DashboardWidgetsConfig,
  keys: DashboardWidgetKey[],
  selected: boolean
): DashboardWidgetsConfig {
  const next = { ...widgets };
  for (const key of keys) {
    next[key] = selected;
  }
  return next;
}

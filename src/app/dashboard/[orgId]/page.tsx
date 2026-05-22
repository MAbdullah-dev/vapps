"use client";

import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Script from "next/script";
import { ChartNoAxesCombined, CircleAlert, CircleCheckBig, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";

import { CartesianGrid, Line, LineChart, XAxis, Pie, PieChart, Cell } from "recharts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useTranslate } from "@/components/providers/translation-provider";
import { documentActivityVerb } from "@/lib/document-activity-labels";

const BOTPRESS_INJECT_URL = "https://cdn.botpress.cloud/webchat/v3.6/inject.js";
const BOTPRESS_CONFIG_SCRIPT_URL =
    "https://files.bpcontent.cloud/2026/05/06/16/20260506160354-CUMY8R3G.js";

type BotpressWindow = Window & {
    botpress?: {
        open?: () => void;
        on?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
};

type ActivityItem = {
  id: string;
  processId: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  entityTitle: string | null;
  details?: { newStatus?: string; assignee?: string; statusLabel?: string };
  createdAt: string;
  processName?: string | null;
};

function formatTimeAgo(dateString: string, tr: (s: string) => string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffSec < 60) return tr("Just now");
  if (diffMin < 60) return tr(`${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`);
  if (diffHr < 24) return tr(`${diffHr} hour${diffHr !== 1 ? "s" : ""} ago`);
  if (diffDay < 7) return tr(`${diffDay} day${diffDay !== 1 ? "s" : ""} ago`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getActivityMessage(activity: ActivityItem, tr: (s: string) => string): ReactNode {
  const userName = activity.userName || activity.userEmail || tr("Someone");
  const entityTitle = activity.entityTitle || activity.entityId || tr("item");
  const processCtx = activity.processName ? ` ${tr("in")} ${activity.processName}` : "";

  if (activity.entityType === "audit_plan") {
    const label = activity.details?.statusLabel || activity.action?.replace("audit_plan.", "") || tr("updated");
    return (
      <>
        <span className="text-foreground font-medium">{tr("Audit")}</span>
        <span className="text-muted-foreground"> {label}: {entityTitle}</span>
      </>
    );
  }

  if (activity.entityType === "document" || activity.action.startsWith("document.")) {
    const verb = documentActivityVerb(activity.action);
    return (
      <>
        <span className="text-foreground font-medium">{userName}</span>
        <span className="text-muted-foreground"> {verb}: {entityTitle}</span>
      </>
    );
  }

  switch (activity.action) {
    case "issue.created":
      return <><span className="text-foreground font-medium">{userName}</span><span className="text-muted-foreground"> {tr("created issue")} {entityTitle}{processCtx}</span></>;
    case "issue.updated":
      return <><span className="text-foreground font-medium">{userName}</span><span className="text-muted-foreground"> {tr("updated issue")} {entityTitle}{processCtx}</span></>;
    case "issue.status_changed":
      const newStatus = activity.details?.newStatus || tr("updated");
      return <><span className="text-foreground font-medium">{userName}</span><span className="text-muted-foreground"> {tr("changed status of")} {entityTitle} {tr("to")} {newStatus}{processCtx}</span></>;
    case "issue.assigned":
      const assignee = activity.details?.assignee || tr("someone");
      return <><span className="text-foreground font-medium">{userName}</span><span className="text-muted-foreground"> {tr("assigned")} {entityTitle} {tr("to")} {assignee}{processCtx}</span></>;
    case "sprint.created":
      return <><span className="text-foreground font-medium">{userName}</span><span className="text-muted-foreground"> {tr("created sprint")} {entityTitle}{processCtx}</span></>;
    case "review.submitted":
      return <><span className="text-foreground font-medium">{userName}</span><span className="text-muted-foreground"> {tr("submitted review for")} {entityTitle}{processCtx}</span></>;
    case "verification.completed":
      return <><span className="text-foreground font-medium">{userName}</span><span className="text-muted-foreground"> {tr("completed verification for")} {entityTitle}{processCtx}</span></>;
    default:
      return <><span className="text-foreground font-medium">{userName}</span><span className="text-muted-foreground"> {activity.action} {entityTitle}{processCtx}</span></>;
  }
}

function getInitials(activity: ActivityItem): string {
  const name = activity.userName || "";
  const email = activity.userEmail || "";
  if (name) {
    const parts = name.split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  if (activity.entityType === "audit_plan") return "AU";
  return "??";
}

function getAvatarColor(activity: ActivityItem): string {
  const colors = ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444", "#6366F1"];
  const id = activity.userId || activity.id;
  const index = parseInt(id.slice(-1), 16) % colors.length;
  return colors[index];
}

type DashboardStats = {
  processCount: number;
  openIssuesCount: number;
  upcomingAuditsCount: number;
  complianceScore: number;
};

export default function OrgDashboardPage() {
    const ACTIVITY_PAGE_SIZE = 10;
    const params = useParams();
    const { t } = useTranslate();
    const orgId = params?.orgId as string;

    const chartConfig = useMemo(
        () =>
            ({
                created: { label: t("Issues created"), color: "var(--chart-1)" },
                completed: { label: t("Issues completed"), color: "var(--chart-2)" },
                count: { label: t("Count"), color: "var(--chart-1)" },
            }) satisfies ChartConfig,
        [t]
    );

    const auditStatusLabel = useCallback(
        (status: string) => {
            if (status === "draft") return t("Draft");
            if (status === "plan_submitted_to_auditee") return t("With auditee");
            if (status === "findings_submitted_to_auditee") return t("Findings submitted");
            if (status === "ca_submitted_to_auditor") return t("With auditor");
            if (status === "verification_ineffective") return t("Returned to auditee");
            if (status === "pending_closure") return t("Pending closure");
            return t("In progress");
        },
        [t]
    );
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [activitiesLoading, setActivitiesLoading] = useState(true);
    const [activitiesPage, setActivitiesPage] = useState(1);
    const [upcomingAudits, setUpcomingAudits] = useState<Array<{ id: string; title: string | null; auditNumber: string | null; status: string; plannedDate: string | null }>>([]);
    const [upcomingAuditsLoading, setUpcomingAuditsLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [lineChartData, setLineChartData] = useState<Array<{ month: string; created: number; completed: number }>>([]);
    const [pieChartData, setPieChartData] = useState<Array<{ status: string; count: number; fill: string }>>([]);
    const [chartsLoading, setChartsLoading] = useState(true);

    const [botpressInjectReady, setBotpressInjectReady] = useState(false);
    const pendingOpenBotpressRef = useRef(false);

    const tryOpenBotpress = useCallback(() => {
        const bp = (window as BotpressWindow).botpress;
        if (typeof bp?.open === "function") {
            bp.open();
            pendingOpenBotpressRef.current = false;
            return true;
        }
        return false;
    }, []);

    const handleAskVieAi = useCallback(() => {
        pendingOpenBotpressRef.current = true;
        tryOpenBotpress();
    }, [tryOpenBotpress]);

    useEffect(() => {
        if (!orgId) return;
        apiClient
            .getDashboardStats(orgId)
            .then((res) => setStats(res))
            .catch(() => setStats(null))
            .finally(() => setStatsLoading(false));
    }, [orgId]);

    useEffect(() => {
        if (!orgId) return;
        apiClient
            .getOrganizationActivity(orgId, 100)
            .then((res) => setActivities(res.activities || []))
            .catch(() => setActivities([]))
            .finally(() => setActivitiesLoading(false));
    }, [orgId]);

    const lastMonthActivities = useMemo(() => {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        return activities.filter((activity) => {
            const activityDate = new Date(activity.createdAt);
            if (Number.isNaN(activityDate.getTime())) return false;
            return activityDate >= oneMonthAgo;
        });
    }, [activities]);

    const totalActivityPages = Math.max(1, Math.ceil(lastMonthActivities.length / ACTIVITY_PAGE_SIZE));
    const paginatedActivities = useMemo(() => {
        const start = (activitiesPage - 1) * ACTIVITY_PAGE_SIZE;
        const end = start + ACTIVITY_PAGE_SIZE;
        return lastMonthActivities.slice(start, end);
    }, [lastMonthActivities, activitiesPage]);

    useEffect(() => {
        setActivitiesPage(1);
    }, [orgId]);

    useEffect(() => {
        if (activitiesPage > totalActivityPages) {
            setActivitiesPage(totalActivityPages);
        }
    }, [activitiesPage, totalActivityPages]);

    useEffect(() => {
        if (!orgId) return;
        apiClient
            .getUpcomingAuditPlans(orgId)
            .then((res) => setUpcomingAudits(res.plans || []))
            .catch(() => setUpcomingAudits([]))
            .finally(() => setUpcomingAuditsLoading(false));
    }, [orgId]);

    useEffect(() => {
        if (!orgId) return;
        apiClient
            .getDashboardCharts(orgId)
            .then((res) => {
                setLineChartData(res.lineChart || []);
                setPieChartData(res.pieChart || []);
            })
            .catch(() => {
                setLineChartData([]);
                setPieChartData([]);
            })
            .finally(() => setChartsLoading(false));
    }, [orgId]);

    const onBotpressConfigLoaded = useCallback(() => {
        const w = window as BotpressWindow;
        w.botpress?.on?.("webchat:initialized", () => {
            if (pendingOpenBotpressRef.current) tryOpenBotpress();
        });
        tryOpenBotpress();
    }, [tryOpenBotpress]);

    const lineChartDisplayData = useMemo(
        () => lineChartData.map((row) => ({ ...row, month: t(row.month) })),
        [lineChartData, t]
    );
    const pieChartDisplayData = useMemo(
        () => pieChartData.map((row) => ({ ...row, status: t(row.status) })),
        [pieChartData, t]
    );

    return (
        <>
            <Script src={BOTPRESS_INJECT_URL} strategy="afterInteractive" onLoad={() => setBotpressInjectReady(true)} />
            {botpressInjectReady ? (
                <Script
                    src={BOTPRESS_CONFIG_SCRIPT_URL}
                    strategy="afterInteractive"
                    onLoad={onBotpressConfigLoaded}
                />
            ) : null}
            {/* Top Cards */}
            <div className="dashboard-progress-cards grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Card 1 - Active Projects */}
                <div className="flex flex-col justify-between bg-background text-foreground rounded-xl border border-border p-5">
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-xs text-muted-foreground">{t("Active Projects")}</p>
                        <ChartNoAxesCombined size={18} className="text-muted-foreground" />
                    </div>
                    <div>
                        <span className="">{statsLoading ? "—" : (stats?.processCount ?? 0)}</span>
                        <p className="flex items-center text-sm mt-1 text-muted-foreground">{t("Across organization")}</p>
                    </div>
                </div>

                {/* Card 2 - Open Issues */}
                <div className="flex flex-col justify-between bg-background text-foreground rounded-xl border border-border p-5">
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-xs text-muted-foreground">{t("Open Issues")}</p>
                        <CircleAlert size={18} className="text-muted-foreground" />
                    </div>
                    <div>
                        <span className="">{statsLoading ? "—" : (stats?.openIssuesCount ?? 0)}</span>
                        <p className="flex items-center text-sm mt-1 text-muted-foreground">{t("To do + In progress")}</p>
                    </div>
                </div>

                {/* Card 3 - Upcoming Audits */}
                <div className="flex flex-col justify-between bg-background text-foreground rounded-xl border border-border p-5">
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-xs text-muted-foreground">{t("Upcoming Audits")}</p>
                        <CircleCheckBig size={18} className="text-muted-foreground" />
                    </div>
                    <div>
                        <span className="">{statsLoading ? "—" : (stats?.upcomingAuditsCount ?? 0)}</span>
                        <p className="flex items-center text-sm mt-1 text-muted-foreground">{t("In progress (pending)")}</p>
                    </div>
                </div>

                {/* Card 4 - Compliance Score */}
                <div className="flex flex-col justify-between bg-background text-foreground rounded-xl border border-border p-5">
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-xs text-muted-foreground">{t("Compliance Score")}</p>
                        <TrendingUp size={18} className="text-muted-foreground" />
                    </div>
                    <div className="space-y-3">
                        <span className="text-2xl font-semibold">{statsLoading ? "—" : `${stats?.complianceScore ?? 0}%`}</span>
                        <Progress value={statsLoading ? 0 : (stats?.complianceScore ?? 0)} className="h-2" />
                    </div>
                </div>
            </div>
       

            {/* Charts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Line Chart - Issues created vs completed (last 6 months) */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t("Issues created vs completed")}</CardTitle>
                        <CardDescription>{t("Last 6 months across the organization")}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4">
                        {chartsLoading ? (
                            <div className="max-h-[250px] flex items-center justify-center text-sm text-muted-foreground">{t("Loading chart…")}</div>
                        ) : lineChartDisplayData.length === 0 ? (
                            <div className="max-h-[250px] flex items-center justify-center text-sm text-muted-foreground">{t("No issue data yet")}</div>
                        ) : (
                            <ChartContainer config={chartConfig} className="max-h-[250px] w-full">
                                <LineChart
                                    accessibilityLayer
                                    data={lineChartDisplayData}
                                    margin={{ left: 12, right: 12 }}
                                >
                                    <CartesianGrid vertical={false} />
                                    <XAxis
                                        dataKey="month"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                    />
                                    <ChartTooltip
                                        cursor={false}
                                        content={<ChartTooltipContent hideLabel />}
                                    />
                                    <Line
                                        dataKey="created"
                                        type="natural"
                                        stroke="var(--chart-1)"
                                        strokeWidth={2}
                                        dot={{ fill: "var(--chart-1)" }}
                                        activeDot={{ r: 6 }}
                                    />
                                    <Line
                                        dataKey="completed"
                                        type="natural"
                                        stroke="var(--chart-2)"
                                        strokeWidth={2}
                                        dot={{ fill: "var(--chart-2)" }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ChartContainer>
                        )}
                    </CardContent>
                    <CardFooter className="flex-col items-start gap-2 text-sm">
                        <div className="text-muted-foreground leading-none">
                            {t("Organization-wide issue trend")}
                        </div>
                    </CardFooter>
                </Card>

                {/* Pie Chart - Issues by status */}
                <Card>
                    <CardHeader className="items-center pb-0">
                        <CardTitle>{t("Issues by status")}</CardTitle>
                        <CardDescription>{t("To do, in progress, and done")}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 pb-0">
                        {chartsLoading ? (
                            <div className="max-h-[250px] flex items-center justify-center text-sm text-muted-foreground">{t("Loading chart…")}</div>
                        ) : pieChartDisplayData.length === 0 || pieChartDisplayData.every((d) => d.count === 0) ? (
                            <div className="max-h-[250px] flex items-center justify-center text-sm text-muted-foreground">{t("No issues yet")}</div>
                        ) : (
                            <ChartContainer
                                config={chartConfig}
                                className="mx-auto max-h-[250px] aspect-square [&_.recharts-pie-label-text]:fill-foreground"
                            >
                                <PieChart>
                                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                    <Pie
                                        data={pieChartDisplayData}
                                        dataKey="count"
                                        nameKey="status"
                                        label
                                        outerRadius={80}
                                    >
                                        {pieChartDisplayData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ChartContainer>
                        )}
                    </CardContent>
                    <CardFooter className="flex-col gap-2 text-sm">
                        <div className="text-muted-foreground leading-none">
                            {t("Distribution across organization")}
                        </div>
                    </CardFooter>
                </Card>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                {/* Recent Activity Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t("Recent Activity")}</CardTitle>
                        <CardDescription>{t("Latest updates from your organization")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {activitiesLoading ? (
                            <p className="text-sm text-muted-foreground py-4">{t("Loading activity…")}</p>
                        ) : lastMonthActivities.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4">{t("No recent activity")}</p>
                        ) : (
                            paginatedActivities.map((activity) => (
                                <ul key={activity.id} className="flex items-start gap-3">
                                    <li>
                                        <Avatar
                                            className="h-8 w-8"
                                            style={{ backgroundColor: getAvatarColor(activity) }}
                                        >
                                            <AvatarFallback className="text-white text-xs">
                                                {getInitials(activity)}
                                            </AvatarFallback>
                                        </Avatar>
                                    </li>
                                    <li className="flex flex-col min-w-0 flex-1">
                                        <p className="text-muted-foreground text-sm">
                                            {getActivityMessage(activity, t)}
                                        </p>
                                        <span className="text-muted-foreground text-xs mt-0.5">
                                            {formatTimeAgo(activity.createdAt, t)}
                                        </span>
                                    </li>
                                </ul>
                            ))
                        )}
                        {!activitiesLoading && lastMonthActivities.length > ACTIVITY_PAGE_SIZE ? (
                            <div className="flex items-center justify-between pt-2">
                                <span className="text-xs text-muted-foreground">
                                    Page {activitiesPage} of {totalActivityPages}
                                </span>
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setActivitiesPage((prev) => Math.max(1, prev - 1))}
                                        disabled={activitiesPage === 1}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setActivitiesPage((prev) => Math.min(totalActivityPages, prev + 1))}
                                        disabled={activitiesPage === totalActivityPages}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                    </CardContent>
                </Card>

                {/* Upcoming Audits Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t("Upcoming Audits")}</CardTitle>
                        <CardDescription>{t("Organization audits in progress (pending)")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {upcomingAuditsLoading ? (
                            <p className="text-sm text-muted-foreground py-4">{t("Loading…")}</p>
                        ) : upcomingAudits.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4">{t("No audits in progress")}</p>
                        ) : (
                            upcomingAudits.map((audit) => {
                                const statusLabel = auditStatusLabel(audit.status);
                                const displayTitle =
                                    audit.title?.trim() ||
                                    (audit.auditNumber ? `${t("Audit")} #${audit.auditNumber}` : t("Audit"));
                                const dateStr = audit.plannedDate
                                    ? new Date(audit.plannedDate).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                          year: "numeric",
                                      })
                                    : "—";
                                return (
                                    <Link
                                        key={audit.id}
                                        href={`/dashboard/${orgId}/audit/create/1?auditPlanId=${audit.id}`}
                                    >
                                        <ul className="flex justify-between items-center border-b border-border py-2 hover:bg-primary/10 rounded-md -mx-2 px-2 transition-colors">
                                            <li className="flex flex-col min-w-0">
                                                <p className="font-medium text-foreground truncate">
                                                    {displayTitle}
                                                </p>
                                                <span className="text-xs text-muted-foreground">{dateStr}</span>
                                            </li>
                                            <li>
                                                <span
                                                    className="text-sm font-medium whitespace-nowrap"
                                                    style={{
                                                        color: "hsl(var(--yellow-600))"
                                                    }}
                                                >
                                                    {statusLabel}
                                                </span>
                                            </li>
                                        </ul>
                                    </Link>
                                );
                            })
                        )}
                    </CardContent>
                </Card>
            </div>
       
            <div className="mt-5 p-5 rounded-lg bg-background border border-border flex sm:flex-row flex-col sm:items-center justify-between">
                <div className="description mb-3.5 sm:mb-0">
                    <h3 className="font-semibold text-sm mb-1 text-foreground">{t("Need Help? Ask Vie AI")}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        {t("Get instant insights, generate reports, or find information quickly.")}
                    </p>
                </div>
                <Button
                    type="button"
                    variant="default"
                    size="lg"
                    className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={handleAskVieAi}
                >
                    {t("Ask Vie AI")}
                </Button>
            </div>
       
        </>
    );
}
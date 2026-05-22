"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useOrg } from "@/components/providers/org-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, CheckCircle2, Circle, PlayCircle, FileText, GitBranch, ChevronLeft, ChevronRight } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { getSelectedSiteIdFromStorage } from "@/lib/selected-site";
import { useTranslate } from "@/components/providers/translation-provider";

type Activity = {
  id?: string | null;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  action?: string | null;
  entityType?: string | null;
  entityId?: string;
  entityTitle?: string;
  details: Record<string, unknown>;
  createdAt: string;
};

type IssueStats = {
  toDo: number;
  inProgress: number;
  completed: number;
  total: number;
  completionPercentage: number;
};

type ProcessUser = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  role: string;
};

const ACTIVITY_FETCH_LIMIT = 500;
const ACTIVITY_PAGE_SIZE = 5;
const TEAM_PAGE_SIZE = 5;
const SPACE_STATS_PAGE_SIZE = 4;
const ACTIVITY_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;

const STATUS_LABEL_KEYS: Record<string, string> = {
  "to-do": "To Do",
  "in-progress": "In Progress",
  "in-review": "In Review",
  done: "Done",
  backlog: "Backlog",
};

const SYSTEM_ROLE_LABEL_KEYS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  member: "Member",
};

function ListPagination({
  page,
  pageSize,
  total,
  onPageChange,
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const { t } = useTranslate();
  if (total <= pageSize) return null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const from = (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border ${className ?? ""}`}>
      <p className="text-xs text-muted-foreground">
        {t("Showing")} {from}–{to} {t("of")} {total}
      </p>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          aria-label={t("Previous page")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums px-1 min-w-18 text-center">
          {safePage} / {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          aria-label={t("Next page")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function IssuesOrgSummaryPage() {
  const { orgId } = useOrg();
  const { t, locale } = useTranslate();

  const [siteId, setSiteId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<IssueStats>({
    toDo: 0,
    inProgress: 0,
    completed: 0,
    total: 0,
    completionPercentage: 0,
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [teamMembers, setTeamMembers] = useState<ProcessUser[]>([]);
  const [activityPage, setActivityPage] = useState(1);
  const [teamPage, setTeamPage] = useState(1);
  const [spaceStatsPage, setSpaceStatsPage] = useState(1);

  useEffect(() => {
    if (!orgId) return;
    const read = () => setSiteId(getSelectedSiteIdFromStorage(orgId) || "");
    read();
    const onSite = () => read();
    window.addEventListener("siteChanged", onSite);
    return () => window.removeEventListener("siteChanged", onSite);
  }, [orgId]);

  useEffect(() => {
    setActivityPage(1);
    setTeamPage(1);
    setSpaceStatsPage(1);
  }, [orgId, siteId]);

  const fetchData = useCallback(async () => {
    if (!orgId || !siteId) {
      setStats({
        toDo: 0,
        inProgress: 0,
        completed: 0,
        total: 0,
        completionPercentage: 0,
      });
      setActivities([]);
      setTeamMembers([]);
      setActivityPage(1);
      setTeamPage(1);
      setSpaceStatsPage(1);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const [issuesRes, activityRes, usersRes] = await Promise.all([
        apiClient.getOrgIssues(orgId, { siteId }),
        apiClient.getOrganizationActivity(orgId, ACTIVITY_FETCH_LIMIT),
        apiClient.getMembers(orgId),
      ]);

      const allIssues = issuesRes.issues || [];
      const toDo = allIssues.filter((i: { status: string }) => i.status === "to-do").length;
      const inProgress = allIssues.filter((i: { status: string }) => i.status === "in-progress").length;
      const completed = allIssues.filter((i: { status: string }) => i.status === "done").length;
      const total = allIssues.length;
      const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      setStats({ toDo, inProgress, completed, total, completionPercentage });
      setActivities((activityRes.activities || []) as Activity[]);
      setTeamMembers(
        (usersRes.teamMembers || []).map((m) => ({
          id: m.id ?? "",
          name: m.name || m.email || "",
          email: m.email ?? "",
          role: m.systemRole || "member",
        }))
      );
    } catch (error: unknown) {
      console.error("Error fetching summary data:", error);
      toast.error(t("Failed to load dashboard data"));
    } finally {
      setIsLoading(false);
    }
  }, [orgId, siteId, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const shouldRefresh = useCallback(
    (detail: Record<string, unknown>) => {
      if (detail.orgId !== orgId) return false;
      if (!siteId) return false;
      if (detail.siteId != null && detail.siteId !== siteId) return false;
      return true;
    },
    [orgId, siteId]
  );

  useEffect(() => {
    const onCreated = (event: Event) => {
      const d = (event as CustomEvent).detail || {};
      if (shouldRefresh(d)) fetchData();
    };
    const onUpdated = (event: Event) => {
      const d = (event as CustomEvent).detail || {};
      if (shouldRefresh(d)) fetchData();
    };
    window.addEventListener("issueCreated", onCreated);
    window.addEventListener("issueUpdated", onUpdated);
    return () => {
      window.removeEventListener("issueCreated", onCreated);
      window.removeEventListener("issueUpdated", onUpdated);
    };
  }, [fetchData, shouldRefresh]);

  const activitiesLastMonth = useMemo(() => {
    const cutoff = Date.now() - ACTIVITY_LOOKBACK_MS;
    return [...activities]
      .filter((a) => {
        if (!a.createdAt) return false;
        return new Date(a.createdAt).getTime() >= cutoff;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [activities]);

  const spaceStatRows = useMemo(
    () => [
      { label: t("Total tasks"), value: <span className="text-foreground tabular-nums">{stats.total}</span> },
      { label: t("To Do"), value: <span className="text-foreground tabular-nums">{stats.toDo}</span> },
      { label: t("In Progress"), value: <span className="text-foreground tabular-nums">{stats.inProgress}</span> },
      { label: t("Completed"), value: <span className="text-foreground tabular-nums">{stats.completed}</span> },
      {
        label: t("Open tasks"),
        value: <span className="text-foreground tabular-nums">{stats.toDo + stats.inProgress}</span>,
      },
      {
        label: t("Completion"),
        value: <span className="text-foreground tabular-nums">{stats.completionPercentage}%</span>,
      },
      { label: t("Sync status"), value: <Badge variant="outline">{t("Synced")}</Badge> },
    ],
    [stats, t]
  );

  const paginatedActivities = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(activitiesLastMonth.length / ACTIVITY_PAGE_SIZE));
    const safePage = Math.min(activityPage, totalPages);
    return activitiesLastMonth.slice((safePage - 1) * ACTIVITY_PAGE_SIZE, safePage * ACTIVITY_PAGE_SIZE);
  }, [activitiesLastMonth, activityPage]);

  const paginatedTeam = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(teamMembers.length / TEAM_PAGE_SIZE));
    const safePage = Math.min(teamPage, totalPages);
    return teamMembers.slice((safePage - 1) * TEAM_PAGE_SIZE, safePage * TEAM_PAGE_SIZE);
  }, [teamMembers, teamPage]);

  const paginatedSpaceStats = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(spaceStatRows.length / SPACE_STATS_PAGE_SIZE));
    const safePage = Math.min(spaceStatsPage, totalPages);
    return spaceStatRows.slice((safePage - 1) * SPACE_STATS_PAGE_SIZE, safePage * SPACE_STATS_PAGE_SIZE);
  }, [spaceStatRows, spaceStatsPage]);

  useEffect(() => {
    const tpA = Math.max(1, Math.ceil(activitiesLastMonth.length / ACTIVITY_PAGE_SIZE));
    if (activityPage > tpA) setActivityPage(tpA);
    const tpT = Math.max(1, Math.ceil(teamMembers.length / TEAM_PAGE_SIZE));
    if (teamPage > tpT) setTeamPage(tpT);
    const tpS = Math.max(1, Math.ceil(spaceStatRows.length / SPACE_STATS_PAGE_SIZE));
    if (spaceStatsPage > tpS) setSpaceStatsPage(tpS);
  }, [
    activitiesLastMonth.length,
    teamMembers.length,
    spaceStatRows.length,
    activityPage,
    teamPage,
    spaceStatsPage,
  ]);

  const formatStatus = (status?: string) => {
    if (!status) return "";
    const label = STATUS_LABEL_KEYS[status];
    return label ? t(label) : status;
  };

  const formatRole = (role?: string) => {
    if (!role) return "";
    const key = SYSTEM_ROLE_LABEL_KEYS[role.toLowerCase()];
    return key ? t(key) : role;
  };

  const formatTimeAgo = (dateString?: string | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} ${t("seconds ago")}`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} ${t("minutes ago")}`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ${t("hours ago")}`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} ${t("days ago")}`;
    return date.toLocaleDateString(locale === "en" ? "en-US" : locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getActivityIcon = (action?: string | null, entityType?: string | null) => {
    const a = (action || "").toLowerCase();
    const et = entityType || "";
    if (et === "issue") {
      if (a.includes("created")) return <Circle className="h-4 w-4 text-blue-500" />;
      if (a.includes("status_changed")) return <PlayCircle className="h-4 w-4 text-orange-500" />;
      if (a.includes("completed") || a.includes("done")) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
    if (et === "sprint") {
      return <GitBranch className="h-4 w-4 text-purple-500" />;
    }
    if (et === "review") {
      return <FileText className="h-4 w-4 text-indigo-500" />;
    }
    return <Circle className="h-4 w-4 text-muted-foreground" />;
  };

  const getActivityMessage = (activity: Activity) => {
    const userName = activity.userName || activity.userEmail || t("Unknown User");
    const entityTitle = activity.entityTitle || activity.entityId || t("item");
    const act = activity.action || "";

    switch (act) {
      case "issue.created":
        return (
          <>
            <span className="font-medium">{userName}</span> {t("created issue")}{" "}
            <span className="font-medium">{entityTitle}</span>
          </>
        );
      case "issue.updated":
        return (
          <>
            <span className="font-medium">{userName}</span> {t("updated issue")}{" "}
            <span className="font-medium">{entityTitle}</span>
          </>
        );
      case "issue.status_changed": {
        const rawStatus = (activity.details?.newStatus as string) || "";
        const newStatus = rawStatus ? formatStatus(rawStatus) : t("updated");
        return (
          <>
            <span className="font-medium">{userName}</span> {t("changed status of")}{" "}
            <span className="font-medium">{entityTitle}</span> {t("to")} {newStatus}
          </>
        );
      }
      case "issue.assigned": {
        const assignee = (activity.details?.assignee as string) || t("someone");
        return (
          <>
            <span className="font-medium">{userName}</span> {t("assigned")}{" "}
            <span className="font-medium">{entityTitle}</span> {t("to")} {assignee}
          </>
        );
      }
      case "sprint.created":
        return (
          <>
            <span className="font-medium">{userName}</span> {t("created sprint")}{" "}
            <span className="font-medium">{entityTitle}</span>
          </>
        );
      case "review.submitted":
        return (
          <>
            <span className="font-medium">{userName}</span> {t("submitted review for")}{" "}
            <span className="font-medium">{entityTitle}</span>
          </>
        );
      case "verification.completed":
        return (
          <>
            <span className="font-medium">{userName}</span> {t("completed verification for")}{" "}
            <span className="font-medium">{entityTitle}</span>
          </>
        );
      default:
        return (
          <>
            <span className="font-medium">{userName}</span> {act || t("updated")} {entityTitle}
          </>
        );
    }
  };

  const getUserInitials = (name?: string | null, email?: string | null) => {
    const n = name?.trim() || "";
    const e = email?.trim() || "";
    if (n) {
      const parts = n.split(/\s+/).filter(Boolean);
      if (parts.length >= 2 && parts[0][0] && parts[1][0]) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      if (n.length >= 2) return n.slice(0, 2).toUpperCase();
      if (n.length === 1) return n[0].toUpperCase();
    }
    if (e.length >= 2) return e.slice(0, 2).toUpperCase();
    if (e.length === 1) return e[0].toUpperCase();
    return "??";
  };

  const getUserAvatarColor = (userId?: string | null) => {
    if (!userId || typeof userId !== "string") return "#6B7280";
    const colors = ["#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#6366F1"];
    const last = userId.slice(-1);
    const index = parseInt(last, 16) % colors.length;
    return Number.isNaN(index) ? colors[0] : colors[index];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("Loading dashboard...")}</p>
      </div>
    );
  }

  if (!siteId) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        {t("Select a site in the sidebar to see issues for that site.")}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="summary-progress-cards grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: t("To Do"), value: stats.toDo.toString(), progress: stats.total > 0 ? (stats.toDo / stats.total) * 100 : 0, color: "hsl(var(--muted-foreground))" },
          { title: t("In Progress"), value: stats.inProgress.toString(), progress: stats.total > 0 ? (stats.inProgress / stats.total) * 100 : 0, color: "hsl(var(--primary))" },
          { title: t("Completed"), value: stats.completed.toString(), progress: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0, color: "hsl(var(--primary))" },
          { title: t("Completion"), value: `${stats.completionPercentage}%`, progress: stats.completionPercentage, color: "hsl(var(--foreground))" },
        ].map((card, idx) => (
          <div
            key={idx}
            className="card border border-border rounded-lg p-4 flex flex-col justify-between bg-card"
          >
            <p className="text-muted-foreground text-sm">{card.title}</p>
            <div className="mt-2">
              <span className="text-base font-semibold">{card.value}</span>
              <Progress
                value={card.progress}
                color={card.color}
                trackColor="hsl(var(--muted))"
                className="mt-2"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("Recent Activity")}</CardTitle>
              <CardDescription>
                {t("Organization-wide updates from the last 30 days")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activitiesLastMonth.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("No activity in the last 30 days")}
                </p>
              ) : (
                <>
                  {paginatedActivities.map((activity, idx) => (
                    <div
                      key={
                        activity.id ??
                        `${activity.entityId ?? ""}-${activity.createdAt ?? ""}-${activity.action ?? ""}-${idx}`
                      }
                      className="flex items-start gap-3 border-b border-border pb-4 last:border-b-0"
                    >
                      <Avatar className="h-8 w-8" style={{ backgroundColor: getUserAvatarColor(activity.userId) }}>
                        <AvatarFallback className="text-white text-xs">
                          {getUserInitials(activity.userName, activity.userEmail)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 flex items-start gap-2">
                        <div className="mt-0.5">{getActivityIcon(activity.action, activity.entityType)}</div>
                        <div className="flex-1">
                          <p className="text-muted-foreground text-sm">
                            {getActivityMessage(activity)}
                          </p>
                          <span className="text-muted-foreground text-xs flex items-center gap-1 mt-1">
                            <Clock size={12} /> {formatTimeAgo(activity.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <ListPagination
                    page={activityPage}
                    pageSize={ACTIVITY_PAGE_SIZE}
                    total={activitiesLastMonth.length}
                    onPageChange={setActivityPage}
                  />
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("Upcoming Milestones")}</CardTitle>
              <CardDescription>{t("Sprint dates when issues are linked to a process")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center py-4">
                {t(
                  "Open an issue and link it to a process to use sprint milestones on the Backlog tab."
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex-1 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("Team Members")}</CardTitle>
              <CardDescription>{t("Organization members")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {teamMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">{t("No team members yet")}</p>
              ) : (
                <>
                  {paginatedTeam.map((member, i) => (
                    <div key={member.id || `member-${(teamPage - 1) * TEAM_PAGE_SIZE + i}`} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8" style={{ backgroundColor: getUserAvatarColor(member.id) }}>
                        <AvatarFallback className="text-white text-xs">
                          {getUserInitials(member.name, member.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <p className="text-foreground font-medium">
                          {member.name || member.email || t("User")}
                        </p>
                        <span className="text-muted-foreground text-xs">{formatRole(member.role)}</span>
                      </div>
                    </div>
                  ))}
                  <ListPagination
                    page={teamPage}
                    pageSize={TEAM_PAGE_SIZE}
                    total={teamMembers.length}
                    onPageChange={setTeamPage}
                  />
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("Space Statistics")}</CardTitle>
              <CardDescription>{t("Issues for the selected site")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress
                value={stats.completionPercentage}
                color="hsl(var(--primary))"
                trackColor="hsl(var(--muted))"
                className="mb-2"
              />
              <div className="space-y-3">
                {paginatedSpaceStats.map((row) => (
                  <div key={row.label} className="flex justify-between gap-4 text-xs text-muted-foreground">
                    <span>{row.label}</span>
                    <span className="shrink-0">{row.value}</span>
                  </div>
                ))}
              </div>
              <ListPagination
                page={spaceStatsPage}
                pageSize={SPACE_STATS_PAGE_SIZE}
                total={spaceStatRows.length}
                onPageChange={setSpaceStatsPage}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

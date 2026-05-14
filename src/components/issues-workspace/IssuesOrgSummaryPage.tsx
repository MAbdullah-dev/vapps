"use client";

import { useState, useEffect, useCallback } from "react";
import { useOrg } from "@/components/providers/org-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, CheckCircle2, Circle, PlayCircle, FileText, GitBranch } from "lucide-react";
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

export default function IssuesOrgSummaryPage() {
  const { orgId } = useOrg();
  const { t } = useTranslate();

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

  useEffect(() => {
    if (!orgId) return;
    const read = () => setSiteId(getSelectedSiteIdFromStorage(orgId) || "");
    read();
    const onSite = () => read();
    window.addEventListener("siteChanged", onSite);
    return () => window.removeEventListener("siteChanged", onSite);
  }, [orgId]);

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
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const [issuesRes, activityRes, usersRes] = await Promise.all([
        apiClient.getOrgIssues(orgId, { siteId }),
        apiClient.getOrganizationActivity(orgId, 20),
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
          name: m.name || m.email || "User",
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

  const formatTimeAgo = (dateString?: string | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} ${t("seconds ago")}`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} ${t("minutes ago")}`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ${t("hours ago")}`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} ${t("days ago")}`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
    const userName = activity.userName || activity.userEmail || "Unknown User";
    const entityTitle = activity.entityTitle || activity.entityId || "item";
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
        const newStatus = (activity.details?.newStatus as string) || t("updated");
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
              <CardDescription>{t("Organization-wide updates")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">{t("No activity yet")}</p>
              ) : (
                activities.map((activity, idx) => (
                  <div
                    key={activity.id ?? `activity-${idx}`}
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
                ))
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
                teamMembers.map((member, i) => (
                  <div key={member.id || `member-${i}`} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8" style={{ backgroundColor: getUserAvatarColor(member.id) }}>
                      <AvatarFallback className="text-white text-xs">
                        {getUserInitials(member.name, member.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <p className="text-foreground font-medium">{member.name || member.email}</p>
                      <span className="text-muted-foreground text-xs capitalize">{member.role}</span>
                    </div>
                  </div>
                ))
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
                className="mb-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t("Total tasks")}</span>
                <span>{stats.total}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t("Open tasks")}</span>
                <span>{stats.toDo + stats.inProgress}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t("Sync Status")}</span>
                <Badge variant="outline">{t("Synced")}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

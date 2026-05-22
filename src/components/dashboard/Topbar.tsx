"use client";

import { Search, Bell, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useOrg } from "@/components/providers/org-provider";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { getDashboardPath } from "@/lib/subdomain";
import ThemeToggle from "@/components/common/ThemeToggle";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import { documentActivityVerb } from "@/lib/document-activity-labels";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveProfileImageSrc } from "@/lib/profile-image";
import { useTranslate } from "@/components/providers/translation-provider";

import { Field, FieldGroup } from "@/components/ui/field";
import { Label } from "@/components/ui/label";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type NotificationActivity = {
  id: string;
  userName: string;
  userEmail: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  entityTitle?: string;
  details: Record<string, unknown>;
  createdAt: string;
  processId: string | null;
  processName?: string | null;
};

function formatNotificationMessage(
  a: NotificationActivity,
  tr: (s: string) => string
): string {
  const userName = a.userName || a.userEmail || tr("Someone");
  const entityTitle = a.entityTitle || a.entityId || tr("item");
  const processCtx = a.processName ? ` ${tr("in")} ${a.processName}` : "";

  if (a.entityType === "audit_plan") {
    const statusLabel =
      (a.details?.statusLabel as string) ||
      (a.details?.status as string) ||
      tr("updated");
    return `${tr("Audit plan")} ${entityTitle}: ${statusLabel}`;
  }

  if (a.entityType === "document" || a.action.startsWith("document.")) {
    const verb = tr(documentActivityVerb(a.action));
    return `${userName} ${verb}: ${entityTitle}`;
  }

  switch (a.action) {
    case "issue.created":
      return `${userName} ${tr("created issue")} ${entityTitle}${processCtx}`;
    case "issue.updated":
      return `${userName} ${tr("updated issue")} ${entityTitle}${processCtx}`;
    case "issue.status_changed": {
      const newStatus = (a.details?.newStatus as string) || tr("updated");
      return `${userName} ${tr("changed status of")} ${entityTitle} ${tr("to")} ${newStatus}${processCtx}`;
    }
    case "issue.assigned": {
      const assignee = (a.details?.assignee as string) || tr("someone");
      return `${userName} ${tr("assigned")} ${entityTitle} ${tr("to")} ${assignee}${processCtx}`;
    }
    case "sprint.created":
      return `${userName} ${tr("created sprint")} ${entityTitle}${processCtx}`;
    case "review.submitted":
      return `${userName} ${tr("submitted review for")} ${entityTitle}${processCtx}`;
    case "verification.completed":
      return `${userName} ${tr("completed verification for")} ${entityTitle}${processCtx}`;
    default:
      return `${userName} ${a.action} ${entityTitle}${processCtx}`;
  }
}

function profileInitials(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && parts[0][0] && parts[parts.length - 1][0]) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

function formatRelativeTime(dateString: string, tr: (s: string) => string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffSecs < 60) return tr("Just now");
  if (diffMins < 60) return `${diffMins} ${tr("minutes ago")}`;
  if (diffHours < 24) return `${diffHours} ${tr("hours ago")}`;
  if (diffDays < 7) return `${diffDays} ${tr("days ago")}`;
  return date.toLocaleDateString();
}

/** Build href for notification so clicking navigates to the relevant screen. */
function getNotificationHref(slug: string | undefined, a: NotificationActivity): string | null {
  if (!slug) return null;
  if (a.entityType === "audit_plan" && a.entityId) {
    const base = getDashboardPath(slug, "audit/create/1");
    return `${base}?auditPlanId=${encodeURIComponent(a.entityId)}`;
  }
  if (a.entityType === "document" && a.entityId) {
    const q = new URLSearchParams({
      recordId: a.entityId,
      mode: "view",
    });
    return getDashboardPath(slug, `documents/create?${q.toString()}`);
  }

  if (a.processId) {
    const action = (a.action || "").toLowerCase();
    if (action.includes("issue")) return getDashboardPath(slug, "issues/board");
    if (action.includes("sprint")) return getDashboardPath(slug, `processes/${a.processId}/backlog`);
    if (action.includes("review") || action.includes("verification"))
      return getDashboardPath(slug, `processes/${a.processId}/timeline`);
    return getDashboardPath(slug, `processes/${a.processId}`);
  }
  return null;
}

export default function Topbar() {
  const { orgId, slug: orgSlug } = useOrg();
  const { data: session } = useSession();
  const { t } = useTranslate();
  const userName = session?.user?.name ?? session?.user?.email ?? t("User");
  const avatarSrc = resolveProfileImageSrc(session?.user?.image);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [dismissing, setDismissing] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const { data: notifData, isLoading: notificationsLoading } = useQuery({
    queryKey: ["notifications", orgId],
    queryFn: () => apiClient.getNotifications(orgId!, 25),
    enabled: !!orgId,
    staleTime: 60 * 1000,
  });

  const notifications = notifData?.activities ?? [];
  useEffect(() => {
    if (notifData?.dismissedIds) setDismissedIds(new Set(notifData.dismissedIds));
  }, [notifData?.dismissedIds]);
  const visibleNotifications = notifications.filter((n) => !dismissedIds.has(n.id));
  const notificationCount = visibleNotifications.length;

  const handleDismissOne = async (id: string) => {
    if (!orgId) return;
    setDismissedIds((prev) => new Set([...prev, id]));
    try {
      await apiClient.dismissNotifications(orgId, [id]);
    } catch {
      setDismissedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleClearAll = async () => {
    if (!orgId || visibleNotifications.length === 0) return;
    const ids = visibleNotifications.map((n) => n.id);
    setDismissedIds((prev) => new Set([...prev, ...ids]));
    setDismissing(true);
    try {
      await apiClient.dismissNotifications(orgId, ids);
    } catch {
      setDismissedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    } finally {
      setDismissing(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/auth" });
  };

  return (
    <header className="h-14 border-b bg-background px-4 flex items-center justify-between gap-3">
      <div className="flex-1 flex">
        <div className="relative w-full max-w-md">
          <div className="md:block hidden">
            <Search
              size={18}
              className="absolute top-[50%] transform -translate-y-1/2 left-3 text-muted-foreground"
              aria-hidden
            />
            <Input
              className="pl-10 border-none bg-muted"
              placeholder={t("Search tasks, docs, processes...")}
              aria-label={t("Search")}
            />
          </div>
          <div className="md:hidden block bg-muted p-4 rounded-lg w-5 h-5">
            <Dialog>
              <form>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="absolute top-[50%] transform -translate-y-1/2 left-2 text-muted-foreground"
                    aria-label={t("Search")}
                  >
                    <Search size={18} aria-hidden />
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle>{t("Search")}</DialogTitle>
                    <DialogDescription>
                      {t("Search tasks, docs, processes...")}
                    </DialogDescription>
                  </DialogHeader>
                  <FieldGroup>
                    <Field>
                      <Label htmlFor="search-1">{t("Search")}</Label>
                      <Input id="search-1" name="search" placeholder={t("Search")} />
                    </Field>
                  </FieldGroup>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">{t("Cancel")}</Button>
                    </DialogClose>
                    <Button type="submit">{t("Search")}</Button>
                  </DialogFooter>
                </DialogContent>
              </form>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline">{t("Ask AI Assistant")}</Button>

        <Popover open={notifOpen} onOpenChange={setNotifOpen}>
          <PopoverTrigger
            className="relative p-2 rounded-full hover:bg-accent"
            aria-label={t("Notifications")}
          >
            <Bell className="h-5 w-5" aria-hidden />

            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-medium leading-none">
                {notificationCount}
              </span>
            )}
          </PopoverTrigger>

          <PopoverContent className="w-100 p-4 -translate-x-30 border shadow-lg max-h-[min(24rem,70vh)] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-base font-semibold text-foreground">{t("Notifications")}</h4>
              {!notificationsLoading && visibleNotifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground h-7 px-2"
                  onClick={handleClearAll}
                  disabled={dismissing}
                >
                  {dismissing ? t("Clearing…") : t("Clear all")}
                </Button>
              )}
            </div>
            <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
              {notificationsLoading ? (
                <p className="text-sm text-muted-foreground py-4">{t("Loading…")}</p>
              ) : visibleNotifications.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">{t("No recent activity")}</p>
              ) : (
                visibleNotifications.map((a) => {
                  const href = getNotificationHref(orgSlug, a);
                  const content = (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground z-10"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDismissOne(a.id);
                        }}
                        aria-label={t("Remove notification")}
                      >
                        <X className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                      <p className="text-foreground text-sm pr-6">
                        {formatNotificationMessage(a, t)}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(a.createdAt, t)}
                      </span>
                    </>
                  );
                  return href ? (
                    <Link
                      key={a.id}
                      href={href}
                      className="flex flex-col gap-1.5 p-4 rounded-xl bg-muted/50 group relative pr-9 hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => setNotifOpen(false)}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div
                      key={a.id}
                      className="p-4 rounded-xl flex flex-col gap-1.5 bg-muted/50 group relative pr-9"
                    >
                      {content}
                    </div>
                  );
                })
              )}
            </div>
          </PopoverContent>
        </Popover>

        <LanguageSwitcher />

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-9 gap-2 px-2 hover:bg-accent max-w-[180px]"
              aria-label={t("User menu")}
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={avatarSrc ?? undefined} alt={userName} />
                <AvatarFallback className="bg-muted text-xs text-muted-foreground">
                  {profileInitials(userName)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm font-medium">{userName}</span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-48 p-1">
            <DropdownMenuItem asChild>
              <Link href={orgSlug ? getDashboardPath(orgSlug, "account") : "#"}>
                {t("Account Settings")}
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="text-red-600 font-medium"
              onSelect={(e) => {
                e.preventDefault();
                handleLogout();
              }}
            >
              {t("Logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

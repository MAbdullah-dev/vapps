"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Settings,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  House,
  ClipboardList,
  FileText,
  Bug,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Building2 } from "lucide-react";
import BrandLogo from "@/components/common/BrandLogo";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { apiClient } from "@/lib/api-client";
import {
  getSelectedSiteFromStorage,
  setSelectedSiteInStorage,
  type SiteChangedDetail,
} from "@/lib/selected-site";
import { getDashboardPath } from "@/lib/subdomain";
import { useTranslate } from "@/components/providers/translation-provider";
import { organizationInfoQueryKey } from "@/lib/organization-info-query";
import { canAccessOrgSettings } from "@/lib/settings-access";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SIDEBAR_COLLAPSED_KEY = "dashboard-sidebar-collapsed";

interface Site {
  id: string;
  name: string;
  code: string;
  location: string;
  processes: Array<{ id: string; name: string; createdAt: string }>;
}

function SidebarNavItem({
  href,
  icon,
  label,
  active,
  collapsed,
  className,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
  className?: string;
}) {
  const link = (
    <Link
      href={href}
      className={cn(
        "flex items-center text-sm transition rounded-lg",
        collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2",
        active
          ? "bg-muted font-medium text-foreground"
          : "text-muted-foreground hover:bg-muted/60",
        className
      )}
    >
      {icon}
      {!collapsed ? label : null}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export default function Sidebar({ orgId, slug }: { orgId: string; slug: string }) {
  const { t } = useTranslate();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [processOpen, setProcessOpen] = useState(true);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    } catch {
      setCollapsed(false);
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const { data: sitesData, isLoading } = useQuery({
    queryKey: ["sites", orgId],
    queryFn: () => apiClient.getSites(orgId),
    staleTime: 2 * 60 * 1000,
    enabled: !!orgId,
  });

  const { data: orgInfoResponse } = useQuery({
    queryKey: organizationInfoQueryKey(orgId),
    queryFn: () => apiClient.getOrganizationInfo(orgId),
    staleTime: 2 * 60 * 1000,
    enabled: !!orgId,
  });

  const { data: orgMembership } = useQuery({
    queryKey: ["orgMembership", orgId],
    queryFn: () => apiClient.getMyOrgMembership(orgId),
    staleTime: 2 * 60 * 1000,
    enabled: !!orgId,
  });

  const showSettingsLink = canAccessOrgSettings(
    orgMembership?.leadershipTier,
    orgMembership?.isOwner
  );

  const organization = sitesData?.organization ?? null;
  const orgInfo = orgInfoResponse?.organizationInfo as
    | { name?: string; logo?: string | null }
    | null
    | undefined;
  const orgLogo =
    typeof orgInfo?.logo === "string" && orgInfo.logo.length > 0
      ? orgInfo.logo
      : null;
  const displayOrgName = orgInfo?.name?.trim() || organization?.name || "";
  const footerOrgName = displayOrgName || t("Organization");
  const footerInitials = displayOrgName.slice(0, 2).toUpperCase() || t("—");
  const isOrgOwner = orgMembership?.isOwner ?? false;

  const link = (path: string) => getDashboardPath(slug, path);
  const sidebarProcesses = selectedSite?.processes ?? [];
  const processesNavHref = isOrgOwner
    ? link("settings/sites-departments")
    : link("processes");

  const pathNoQuery = pathname.split("?")[0];
  const isStandaloneIssuesActive =
    /\/issues(?:\/|$)/.test(pathNoQuery) &&
    !/\/processes\/[^/]+\/issues$/.test(pathNoQuery);

  const documentsPath = "documents";
  const issuesPath = "issues";
  const isDashboardActive = pathname === "/" || pathname.includes(`/${slug}`);
  const isProcessesActive =
    pathname.includes("/processes") ||
    (isOrgOwner && pathname.includes("/settings/sites-departments"));
  const isDocumentsActive = pathname.includes("/documents");
  const isAuditActive = pathname.includes("/audit");
  const isSettingsActive = pathname.includes("settings");

  const siteSummary =
    selectedSite?.location || organization?.name || t("No site assigned");
  const siteDetail = selectedSite
    ? `${selectedSite.name}${selectedSite.code ? ` (${selectedSite.code})` : ""}`
    : t("Contact your administrator");

  useEffect(() => {
    if (!sitesData?.sites?.length) return;
    const availableSites = sitesData.sites as Site[];

    if (isOrgOwner) {
      const stored = getSelectedSiteFromStorage(orgId, slug);
      const preserved = stored?.id
        ? availableSites.find((s) => s.id === stored.id)
        : null;
      const active = preserved ?? availableSites[0];
      setSelectedSite(active);
      if (!stored?.id || stored.id !== active.id) {
        setSelectedSiteInStorage(orgId, active, slug);
      }
      return;
    }

    const assigned = availableSites[0];
    setSelectedSite(assigned);
    setSelectedSiteInStorage(orgId, assigned, slug);
  }, [orgId, sitesData, isOrgOwner]);

  useEffect(() => {
    const onSiteChanged = (event: Event) => {
      const detail = (event as CustomEvent<SiteChangedDetail>).detail;
      if (detail.orgId !== orgId) return;

      const fromList = (sitesData?.sites as Site[] | undefined)?.find(
        (s) => s.id === detail.siteId
      );
      if (fromList) {
        setSelectedSite(fromList);
        return;
      }

      const fromEvent = detail.site;
      if (fromEvent?.id === detail.siteId) {
        setSelectedSite({
          id: fromEvent.id,
          name: fromEvent.name ?? "",
          code: fromEvent.code ?? "",
          location: fromEvent.location ?? "",
          processes: fromEvent.processes ?? [],
        });
        return;
      }

      const stored = getSelectedSiteFromStorage(orgId, slug);
      if (stored?.id === detail.siteId) {
        setSelectedSite({
          id: stored.id,
          name: stored.name ?? "",
          code: stored.code ?? "",
          location: stored.location ?? "",
          processes: stored.processes ?? [],
        });
      }
    };
    window.addEventListener("siteChanged", onSiteChanged);
    return () => window.removeEventListener("siteChanged", onSiteChanged);
  }, [orgId, sitesData]);

  useEffect(() => {
    const handleProcessCreated = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail.orgId === orgId) {
        queryClient.invalidateQueries({ queryKey: ["sites", orgId] });
      }
    };

    const handleProcessDeleted = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail.orgId === orgId) {
        queryClient.invalidateQueries({ queryKey: ["sites", orgId] });
      }
    };

    window.addEventListener("processCreated", handleProcessCreated);
    window.addEventListener("processDeleted", handleProcessDeleted);
    return () => {
      window.removeEventListener("processCreated", handleProcessCreated);
      window.removeEventListener("processDeleted", handleProcessDeleted);
    };
  }, [orgId, queryClient]);

  return (
    <aside
      className={cn(
        "hidden md:flex shrink-0 flex-col border-r border-border bg-card text-card-foreground transition-[width] duration-200 ease-in-out",
        "h-[max(90vh,max-content)]",
        collapsed ? "w-16" : "w-[20%] min-w-[240px] max-w-[320px]"
      )}
    >
      <div className={cn("border-b pb-3", collapsed ? "p-3" : "p-5")}>
        <div
          className={cn(
            "flex items-center",
            collapsed ? "justify-center" : "mb-3 justify-between gap-2"
          )}
        >
          {!collapsed ? (
            <BrandLogo className="min-w-0" alt={t("Vie")} width={95} height={40} />
          ) : null}
          <button
            type="button"
            onClick={toggleCollapsed}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label={collapsed ? t("Expand sidebar") : t("Collapse sidebar")}
            aria-expanded={!collapsed}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} aria-hidden />
            ) : (
              <PanelLeftClose size={18} aria-hidden />
            )}
          </button>
        </div>

        {!collapsed ? (
          <div
            className="flex items-center gap-2 rounded-[12px] border border-border p-3"
            aria-label={t("Your site")}
          >
            <Building2 size={18} className="shrink-0" aria-hidden />
            <div className="flex min-w-0 flex-col gap-1.5">
              {isLoading ? (
                <p className="text-xs text-muted-foreground">{t("Loading site…")}</p>
              ) : (
                <>
                  <h3 className="truncate text-xs text-foreground">{siteSummary}</h3>
                  <p className="truncate text-xs text-muted-foreground">{siteDetail}</p>
                </>
              )}
            </div>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="mx-auto flex h-9 w-9 items-center justify-center rounded-[12px] border border-border"
                aria-label={t("Your site")}
              >
                <Building2 size={18} aria-hidden />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-56">
              <p className="font-medium">{siteSummary}</p>
              <p className="text-xs text-muted-foreground">{siteDetail}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <nav className={cn("flex-1 space-y-1", collapsed ? "p-2" : "p-5")}>
        <SidebarNavItem
          href={link("")}
          icon={<House size={18} />}
          label={t("Dashboard")}
          active={isDashboardActive}
          collapsed={collapsed}
          className={collapsed ? undefined : "border-b border-border pb-5 mb-2 rounded-none hover:bg-transparent"}
        />

        {collapsed ? (
          <SidebarNavItem
            href={processesNavHref}
            icon={<FolderKanban size={18} />}
            label={t("Processes")}
            active={isProcessesActive}
            collapsed={collapsed}
          />
        ) : (
          <>
            <div
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                pathname.includes("/processes") ? "bg-muted" : "hover:bg-muted/60"
              }`}
            >
              <Link
                href={processesNavHref}
                className={`flex items-center gap-3 ${
                  isProcessesActive ? "font-medium text-primary" : "text-muted-foreground"
                }`}
              >
                <FolderKanban size={18} />
                {t("Processes")}
              </Link>

              <button
                type="button"
                onClick={() => setProcessOpen((prev) => !prev)}
                aria-label={t("Toggle processes list")}
                aria-expanded={processOpen}
              >
                {processOpen ? (
                  <ChevronDown className="h-4 w-4" aria-hidden />
                ) : (
                  <ChevronRight className="h-4 w-4" aria-hidden />
                )}
              </button>
            </div>

            <Collapsible open={processOpen} onOpenChange={setProcessOpen}>
              <CollapsibleContent className="space-y-1 pt-1 pl-2">
                {sidebarProcesses.length > 0 ? (
                  sidebarProcesses.map((process) => {
                    const processHref = `processes/${process.id}`;
                    const isActive = pathname.includes(processHref);

                    if (isOrgOwner) {
                      return (
                        <span
                          key={process.id}
                          className={`block rounded-lg px-3 py-2 text-sm ${
                            isActive
                              ? "bg-muted font-medium text-foreground"
                              : "text-muted-foreground"
                          }`}
                          title={t("Open from Settings → Sites & Processes")}
                        >
                          {process.name}
                        </span>
                      );
                    }

                    return (
                      <Link
                        key={process.id}
                        href={link(processHref)}
                        className={`block rounded-lg px-3 py-2 text-sm transition ${
                          isActive
                            ? "bg-muted font-medium text-foreground"
                            : "text-muted-foreground hover:bg-muted/60"
                        }`}
                      >
                        {process.name}
                      </Link>
                    );
                  })
                ) : (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    {selectedSite
                      ? isOrgOwner
                        ? t("No processes available")
                        : t("No process assigned")
                      : t("No site assigned")}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </>
        )}

        <SidebarNavItem
          href={link(issuesPath)}
          icon={<Bug size={18} />}
          label={t("Issues")}
          active={isStandaloneIssuesActive}
          collapsed={collapsed}
        />

        <SidebarNavItem
          href={link(documentsPath)}
          icon={<FileText size={18} />}
          label={t("Documents")}
          active={isDocumentsActive}
          collapsed={collapsed}
        />

        <SidebarNavItem
          href={link("audit")}
          icon={<ClipboardList size={18} />}
          label={t("Audit")}
          active={isAuditActive}
          collapsed={collapsed}
        />
      </nav>

      <div className={cn("footer", collapsed ? "p-2" : "p-5")}>
        {showSettingsLink ? (
          <SidebarNavItem
            href={link("settings")}
            icon={<Settings size={18} />}
            label={t("Settings")}
            active={isSettingsActive}
            collapsed={collapsed}
            className={collapsed ? undefined : "mb-3"}
          />
        ) : null}

        {!collapsed ? (
          <div className="flex min-w-0 items-center gap-0 py-3">
            <Avatar className="mr-2 h-9 w-9 shrink-0">
              {orgLogo ? (
                <AvatarImage src={orgLogo} alt="" className="object-cover" />
              ) : null}
              <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
                {footerInitials}
              </AvatarFallback>
            </Avatar>
            <div className="description min-w-0 flex-1">
              <h3 className="truncate text-sm text-foreground">{footerOrgName}</h3>
              <p className="text-xs">{t("Free")}</p>
            </div>
            <Link
              href="/upgrade"
              className="ml-auto shrink-0 rounded-full border border-primary/35 bg-primary/10 p-2.5 text-xs text-primary"
            >
              {t("Upgrade")}
            </Link>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex justify-center py-2">
                <Avatar className="h-9 w-9">
                  {orgLogo ? (
                    <AvatarImage src={orgLogo} alt="" className="object-cover" />
                  ) : null}
                  <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
                    {footerInitials}
                  </AvatarFallback>
                </Avatar>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">{footerOrgName}</TooltipContent>
          </Tooltip>
        )}
      </div>
    </aside>
  );
}

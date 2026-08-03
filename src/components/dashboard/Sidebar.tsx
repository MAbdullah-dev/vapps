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
} from "lucide-react";
import { useState, useEffect } from "react";
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

interface Site {
  id: string;
  name: string;
  code: string;
  location: string;
  processes: Array<{ id: string; name: string; createdAt: string }>;
}

export default function Sidebar({ orgId, slug }: { orgId: string; slug: string }) {
  const { t } = useTranslate();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [processOpen, setProcessOpen] = useState(true);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);

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
    <aside className="hidden md:flex flex-col w-[20%] bg-card text-card-foreground h-max border-r border-border">
      <div className="border-b pb-3 p-5">
        <BrandLogo className="mb-3" alt={t("Vie")} width={95} height={40} />

        <div
          className="flex gap-2 items-center p-3 border border-border rounded-[12px]"
          aria-label={t("Your site")}
        >
          <Building2 size={18} className="shrink-0" aria-hidden />
          <div className="flex flex-col gap-1.5 min-w-0">
            {isLoading ? (
              <p className="text-xs text-muted-foreground">{t("Loading site…")}</p>
            ) : (
              <>
                <h3 className="text-xs text-foreground truncate">
                  {selectedSite?.location ||
                    organization?.name ||
                    t("No site assigned")}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {selectedSite
                    ? `${selectedSite.name}${selectedSite.code ? ` (${selectedSite.code})` : ""}`
                    : t("Contact your administrator")}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <nav className="flex-1 p-5 space-y-1">
        <Link
          href={link("")}
          className={`flex items-center gap-3 px-3 py-2 text-sm transition border-b border-border pb-5 mb-2 ${
            pathname === "/" || pathname.includes(`/${slug}`)
              ? "text-foreground font-medium"
              : "text-muted-foreground"
          }`}
        >
          <House size={18} />
          {t("Dashboard")}
        </Link>

        <div
          className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${
            pathname.includes("/processes") ? "bg-muted" : "hover:bg-muted/60"
          }`}
        >
          <Link
            href={processesNavHref}
            className={`flex items-center gap-3 ${
              pathname.includes("/processes") ||
              (isOrgOwner && pathname.includes("/settings/sites-departments"))
                ? "font-medium text-primary"
                : "text-muted-foreground"
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
          <CollapsibleContent className="pt-1 pl-2 space-y-1">
            {sidebarProcesses.length > 0 ? (
              sidebarProcesses.map((process) => {
                const processHref = `processes/${process.id}`;
                const isActive = pathname.includes(processHref);

                if (isOrgOwner) {
                  return (
                    <span
                      key={process.id}
                      className={`block px-3 py-2 text-sm rounded-lg ${
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
                    className={`block px-3 py-2 text-sm rounded-lg transition ${
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

        <div>
          <Link
            href={link(issuesPath)}
            className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition ${
              isStandaloneIssuesActive
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/60"
            }`}
          >
            <Bug size={18} />
            {t("Issues")}
          </Link>
        </div>

        <div>
          <Link
            href={link(documentsPath)}
            className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition ${
              pathname.includes("/documents")
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/60"
            }`}
          >
            <FileText size={18} />
            {t("Documents")}
          </Link>
        </div>

        <div>
          <Link
            href={link("audit")}
            className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition ${
              pathname.includes("/audit")
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/60"
            }`}
          >
            <ClipboardList size={18} />
            {t("Audit")}
          </Link>
        </div>
      </nav>

      <div className="footer p-5">
        {showSettingsLink ? (
          <Link
            href={link("settings")}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition mb-3 ${
              pathname.includes("settings")
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/60"
            }`}
          >
            <Settings size={18} />
            {t("Settings")}
          </Link>
        ) : null}

        <div className="flex py-3 items-center gap-0 min-w-0">
          <Avatar className="mr-2 h-9 w-9 shrink-0">
            {orgLogo ? (
              <AvatarImage src={orgLogo} alt="" className="object-cover" />
            ) : null}
            <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
              {footerInitials}
            </AvatarFallback>
          </Avatar>
          <div className="description min-w-0 flex-1">
            <h3 className="text-sm text-foreground truncate">{footerOrgName}</h3>
            <p className="text-xs">{t("Free")}</p>
          </div>
          <Link
            href="/upgrade"
            className="text-xs text-primary border border-primary/35 rounded-full bg-primary/10 p-2.5 ml-auto shrink-0"
          >
            {t("Upgrade")}
          </Link>
        </div>
      </div>
    </aside>
  );
}

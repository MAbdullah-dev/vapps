"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Loader2, Building2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import BrandLogo from "@/components/common/BrandLogo";
import { getOrgDashboardUrl } from "@/lib/subdomain";
import { isPlatformSuperAdmin } from "@/lib/platform-roles";
import { getAdminPortalDashboardUrl } from "@/lib/super-admin-policy";
import { useTranslate } from "@/components/providers/translation-provider";

interface Organization {
  id: string;
  slug?: string;
  name: string;
  role: string;
  createdAt: string;
  memberCount: number;
}

export default function ResolvePage() {
  const { t } = useTranslate();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const fetchOrganizations = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getOrganizations();
      setOrganizations(response.organizations || []);
    } catch (err: any) {
      setError(err.message || t("Failed to load organizations"));
      toast.error(t("Failed to load organizations"));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle authentication and data fetching
  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.push("/auth");
      return;
    }

    if (status === "authenticated") {
      if (isPlatformSuperAdmin(session?.user?.platformRole)) {
        setIsRedirecting(true);
        window.location.href = getAdminPortalDashboardUrl();
        return;
      }
      fetchOrganizations();
    }
  }, [status, session?.user?.platformRole, router]);

  // Handle auto-redirect when only one organization, or home when none
  useEffect(() => {
    if (isLoading || isRedirecting || status !== "authenticated") return;

    if (organizations.length === 1) {
      setIsRedirecting(true);
      const slug = organizations[0].slug ?? organizations[0].id;
      const url = getOrgDashboardUrl(slug);
      if (url.startsWith("http")) window.location.href = url;
      else router.push(url);
      return;
    }

    if (organizations.length === 0 && !error) {
      setIsRedirecting(true);
      router.replace("/");
    }
  }, [organizations, isLoading, isRedirecting, status, error, router]);

  const handleSelectOrg = (org: Organization) => {
    const slug = org.slug ?? org.id;
    const url = getOrgDashboardUrl(slug);
    if (url.startsWith("http")) window.location.href = url;
    else router.push(url);
  };

  // Show loading state
  if (status === "loading" || isLoading || isRedirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
        <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-sm text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">
            {isRedirecting ? t("Redirecting...") : t("Loading...")}
          </p>
        </div>
      </div>
    );
  }

  // Show nothing while redirecting unauthenticated users
  if (status === "unauthenticated") {
    return null;
  }

  // Show error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
        <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-sm text-center">
          <p className="text-destructive">{error}</p>
          <Button className="mt-4" onClick={fetchOrganizations}>
            {t("Try Again")}
          </Button>
        </div>
      </div>
    );
  }

  // Empty org list is redirected in the effect above
  if (organizations.length === 0) {
    return null;
  }

  // Multiple organizations - show selection
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-sm">
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <BrandLogo alt={t("Logo")} width={140} height={60} priority />
        </div>

        {/* Heading */}
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold">{t("Select Organization")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("You belong to multiple organizations. Please select one to continue.")}
          </p>
        </div>

        {/* Organization List */}
        <div className="space-y-3">
          {organizations.map((org) => (
            <Button
              key={org.id}
              variant="outline"
              className="w-full justify-start h-auto p-4"
              onClick={() => handleSelectOrg(org)}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">{org.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {org.role} • {org.memberCount}{" "}
                    {org.memberCount !== 1 ? t("members") : t("member")}
                  </p>
                </div>
              </div>
            </Button>
          ))}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t("Logged in as:")} {session?.user?.email}
        </p>
      </div>
    </div>
  );
}

